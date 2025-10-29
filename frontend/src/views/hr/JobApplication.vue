<template>
  <div class="job-application-management">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <FileUser class="title-icon" />
          Job Application Management
        </h1>
        <p class="page-subtitle">Manage job applications, interviews, and hiring process</p>
      </div>
    </div>

    <!-- Tab System -->
    <div class="card bg-accentColor shadow-xl mb-6 border border-black/10 mx-auto">
      <div class="card-body p-0">
        <!-- Tab Navigation -->
        <div class="tabs tabs-boxed bg-white/5 p-2">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="handleTabClick(tab.id)"
            class="tab tab-lg font-medium"
            :class="{
              'tab-active text-black': activeTab === tab.id,
              'text-black/70 hover:bg-white/10': activeTab !== tab.id
            }"
          >
            <component :is="tab.icon" class="w-4 h-4 mr-2" />
        {{ tab.name }}
            <span v-if="tab.id === 'new-applications' && newApplicationsCount > 0" class="badge badge-warning ml-2">
          {{ newApplicationsCount }}
        </span>
      </button>
    </div>

    <!-- Tab Content -->
        <div class="p-6">
      <!-- New Applications Tab -->
          <div v-if="activeTab === 'new-applications'">
            <!-- Stats -->
            <div class="stats shadow w-full mb-6 bg-accentColor border border-black/10 stats-vertical lg:stats-horizontal rounded-lg">
              <div class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10">
                <div class="stat-figure">
                  <Inbox class="w-8 h-8 text-warning" />
                </div>
                <div class="stat-title text-black/50">New Applications</div>
                <div class="stat-value text-warning">{{ newApplicationsCount }}</div>
                <div class="stat-desc text-black/50">Awaiting review</div>
              </div>
              
              <div class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10">
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
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2">
                    <Filter class="w-4 h-4 text-gray-600" />
                    <span class="text-gray-600">Showing {{ getFilteredApplicationsCount() }} applications</span>
                  </div>
                </div>
                
                <div class="flex gap-3">
                  <input 
                    v-model="statusFilter" 
                    type="text" 
                    placeholder="Status filter"
                    class="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                  />
                  
                  <input 
                    v-model="positionFilter" 
                    type="text" 
                    placeholder="Position filter"
                    class="px-3 py-2 bg-white border border-gray-200 rounded-lg"
                  />
                  
                  <button @click="clearFilters" class="px-3 py-2 text-green-600 hover:text-green-700 font-medium">
                    <X class="w-4 h-4 inline mr-1" />
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <!-- Applications Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div 
                v-for="application in paginatedApplications" 
                :key="application.id"
                class="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <!-- Card Header -->
                <div class="flex justify-between items-start mb-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span class="text-green-600 font-semibold text-sm">{{ application.applicant_name.charAt(0) }}</span>
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900 text-lg">{{ application.applicant_name }}</h3>
                      <p class="text-sm text-gray-500">{{ application.email }}</p>
                    </div>
                  </div>
                  <span class="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    {{ application.status }}
                  </span>
                </div>
                
                <!-- Card Content -->
                <div class="mb-4">
                  <p class="text-gray-600 text-sm mb-3">
                    {{ application.position_title || 'No position specified' }}
                  </p>
                  
                  <div class="space-y-2">
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin class="w-4 h-4" />
                      <span>{{ application.department }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar class="w-4 h-4" />
                      <span>{{ application.experience_years }} years experience</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <Target class="w-4 h-4" />
                      <span>{{ application.skills_count }} skills</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <Clock class="w-4 h-4" />
                      <span>Applied {{ formatDate(application.applied_date) }}</span>
                    </div>
                  </div>
                </div>
                
                <!-- Card Actions -->
                <div class="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div class="flex gap-2">
                    <button @click="viewApplication(application)" class="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium transition-colors">
                      <Eye class="w-4 h-4" />
                      View
                    </button>
                    <button @click="setInterviewDate(application)" class="flex items-center gap-2 px-3 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-lg text-sm font-medium transition-colors">
                      <Calendar class="w-4 h-4" />
                      Set Interview
                    </button>
                  </div>
                  <button @click="rejectApplication(application)" class="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg text-sm font-medium transition-colors">
                    <Trash2 class="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div class="flex justify-between items-center mt-8">
              <div class="text-sm text-gray-600">
                Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, getFilteredApplicationsCount()) }} of {{ getFilteredApplicationsCount() }} applications
              </div>
              
              <div class="flex gap-2">
                <button 
                  @click="currentPage = 1" 
                  :disabled="currentPage === 1"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                >
                  First
                </button>
                <button 
                  @click="currentPage = Math.max(1, currentPage - 1)" 
                  :disabled="currentPage === 1"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
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
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                  ]"
                >
                  {{ page }}
                </button>
                
                <button 
                  @click="currentPage = Math.min(totalPages, currentPage + 1)" 
                  :disabled="currentPage === totalPages"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                >
                  Next
                </button>
                <button 
                  @click="currentPage = totalPages" 
                  :disabled="currentPage === totalPages"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
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
          <h3>📅 Interview Schedule</h3>
          <p>Manage scheduled interviews and conduct interview evaluations</p>
        </div>
        <div class="content-section">
          <div class="calendar-container">
            <div class="calendar-header">
              <h4>Scheduled Interviews</h4>
              <div class="calendar-controls">
                <button 
                  @click="interviewFilter = 'all'"
                  :class="['btn', interviewFilter === 'all' ? 'btn-primary' : 'btn-outline']"
                >
                  All
                </button>
                <button 
                  @click="interviewFilter = 'today'"
                  :class="['btn', interviewFilter === 'today' ? 'btn-primary' : 'btn-outline']"
                >
                  Today
                </button>
                <button 
                  @click="interviewFilter = 'this-week'"
                  :class="['btn', interviewFilter === 'this-week' ? 'btn-primary' : 'btn-outline']"
                >
                  This Week
                </button>
                <button 
                  @click="interviewFilter = 'this-month'"
                  :class="['btn', interviewFilter === 'this-month' ? 'btn-primary' : 'btn-outline']"
                >
                  This Month
                </button>
              </div>
            </div>
            
            <!-- Loading State -->
            <div v-if="isLoadingInterviews" class="loading-container">
              <div class="loading loading-spinner loading-lg"></div>
              <span class="loading-text">Loading interviews...</span>
            </div>
            
            <!-- Interviews List -->
            <div v-else-if="filteredInterviews.length > 0" class="interview-list">
              <div
                v-for="interview in filteredInterviews"
                :key="interview.id"
                class="interview-item"
              >
                <div class="interview-time">
                  <div class="time">{{ formatTime(interview.interview_time) }}</div>
                  <div class="date">{{ formatDate(interview.interview_date) }}</div>
                </div>
                <div class="interview-details">
                  <div class="candidate-name">{{ interview.applicant_name }}</div>
                  <div class="position">{{ interview.position_title }}</div>
                  <div class="department">{{ interview.department }}</div>
                  <div v-if="interview.location" class="location">
                    <MapPin class="w-4 h-4 inline mr-1" />
                    {{ interview.location }}
                  </div>
                  <div v-if="interview.meeting_link" class="meeting-link">
                    <a :href="interview.meeting_link" target="_blank" class="text-blue-600 hover:text-blue-800">
                      <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
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
                        : 'type-phone'
                    ]"
                  >
                    {{ interview.interview_type === 'in-person' ? 'In-Person' : 
                       interview.interview_type === 'video' ? 'Video Call' : 'Phone Call' }}
                  </span>
                  <span
                    v-if="!(interview.status === 'completed' && (interview.result === 'passed' || interview.result === 'failed'))"
                    :class="[
                      'interview-status',
                      interview.status === 'scheduled' 
                        ? 'status-scheduled'
                        : interview.status === 'completed'
                        ? 'status-completed'
                        : interview.status === 'cancelled'
                        ? 'status-cancelled'
                        : 'status-rescheduled'
                    ]"
                  >
                    {{ interview.status.charAt(0).toUpperCase() + interview.status.slice(1) }}
                  </span>
                </div>
                <div class="interview-actions">
                  <!-- Interview Decision Buttons -->
                  <div v-if="interview.status === 'scheduled'" class="decision-buttons">
                    <button 
                      @click="conductInterview(interview, 'passed')"
                      class="btn btn-success btn-sm"
                      :disabled="isUpdatingInterview"
                    >
                      <CheckCircle class="w-4 h-4 mr-1" />
                      Interview: Yes
                    </button>
                    <button 
                      @click="conductInterview(interview, 'failed')"
                      class="btn btn-error btn-sm"
                      :disabled="isUpdatingInterview"
                    >
                      <X class="w-4 h-4 mr-1" />
                      Interview: No
                    </button>
                  </div>
                  <!-- Completed Interview Status -->
                  <div v-else-if="interview.status === 'completed'" class="completed-status">
                    <span v-if="interview.result === 'passed'" class="badge badge-success">
                      <CheckCircle class="w-4 h-4 mr-1" />
                      Interview Done
                    </span>
                    <span v-else-if="interview.result === 'failed'" class="badge badge-error">
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
                      @click="rescheduleInterview(interview)"
                      class="btn btn-outline btn-sm"
                      title="Reschedule"
                    >
                      <Calendar class="w-4 h-4" />
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
            </div>
            
            <!-- Empty State -->
            <div v-else class="empty-state">
              <div class="empty-icon">📅</div>
              <h4>No Interviews Found</h4>
              <p v-if="interviewFilter === 'all'">No interviews have been scheduled yet.</p>
              <p v-else>No interviews found for the selected filter.</p>
              <button 
                @click="interviewFilter = 'all'"
                class="btn btn-primary mt-4"
              >
                View All Interviews
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Position Tracker Tab -->
      <div v-if="activeTab === 'position-tracker'" class="tab-panel">
        <div class="content-section">
          <!-- Loading State -->
          <div v-if="isLoadingPositions" class="flex justify-center items-center py-12">
            <div class="loading loading-spinner loading-lg text-green-600"></div>
          </div>

          <!-- No Positions Found -->
          <div v-else-if="positions.length === 0" class="text-center py-12">
            <div class="text-gray-500 mb-4">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No positions found</h3>
            <p class="text-gray-500 mb-4">There are no branch positions available at the moment.</p>
            <button @click="addPosition" class="btn btn-primary">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add New Position
            </button>
          </div>

          <!-- Positions Card Grid -->
          <div v-else-if="positions.length > 0" class="mb-8">
            <!-- Header with Refresh Button and View Toggle -->
            <div class="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-4">
              <div class="flex justify-between items-center">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Open Job Positions</h3>
                  <p class="text-sm text-gray-600 mt-1">List of available positions displayed on the landing page</p>
                </div>
                <div class="flex items-center gap-2">
                  <!-- View Mode Toggle -->
                  <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      @click="viewMode = 'grid'"
                      :class="[
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
                        viewMode === 'grid' 
                          ? 'bg-white text-green-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      ]"
                      title="Grid View"
                    >
                      <List class="w-4 h-4" />
                      Grid
                    </button>
                    <button
                      @click="viewMode = 'card'"
                      :class="[
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
                        viewMode === 'card' 
                          ? 'bg-white text-green-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      ]"
                      title="Card View"
                    >
                      <LayoutGrid class="w-4 h-4" />
                      Card
                    </button>
                  </div>
                  <button
                    @click="loadPositions"
                    :disabled="isLoadingPositions"
                    class="btn btn-outline btn-sm flex items-center gap-2"
                    title="Refresh positions from Position Management"
                  >
                    <RefreshCw :class="['w-4 h-4', isLoadingPositions ? 'animate-spin' : '']" />
                    {{ isLoadingPositions ? 'Loading...' : 'Refresh' }}
                  </button>
                </div>
              </div>
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
            <div v-if="viewMode === 'grid'" class="bg-white rounded-lg shadow-md border border-gray-200 mb-4">
              <!-- Active Filters Display -->
              <div v-if="hasActiveGridFilters" class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 flex-wrap">
                <span class="text-xs font-medium text-gray-600">Active filters:</span>
                <span v-if="gridFilters.position" class="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  Position: {{ gridFilters.position }}
                  <button @click.stop="gridFilters.position = null; gridCurrentPage = 1" class="hover:text-orange-900">
                    <X class="w-3 h-3" />
                  </button>
                </span>
                <span v-if="gridFilters.branch" class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Branch: {{ gridFilters.branch }}
                  <button @click.stop="gridFilters.branch = null; gridCurrentPage = 1" class="hover:text-green-900">
                    <X class="w-3 h-3" />
                  </button>
                </span>
                <span v-if="gridFilters.department" class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Department: {{ gridFilters.department }}
                  <button @click.stop="gridFilters.department = null; gridCurrentPage = 1" class="hover:text-blue-900">
                    <X class="w-3 h-3" />
                  </button>
                </span>
                <span v-if="gridFilters.status" class="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  Status: {{ gridFilters.status }}
                  <button @click.stop="gridFilters.status = null; gridCurrentPage = 1" class="hover:text-purple-900">
                    <X class="w-3 h-3" />
                  </button>
                </span>
                <button @click.stop="clearGridFilters" class="text-xs text-gray-600 hover:text-gray-900 underline ml-2">
                  Clear all
                </button>
              </div>
              
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th 
                        @click="togglePositionFilter(null)"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative group"
                      >
                        <div class="flex items-center gap-1">
                          Position
                          <Filter class="w-3 h-3 opacity-50 group-hover:opacity-100" />
                          <span v-if="gridFilters.position" class="w-2 h-2 bg-orange-600 rounded-full"></span>
                        </div>
                        <!-- Dropdown menu -->
                        <div v-if="availablePositionTitles.length > 0" class="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px] hidden group-hover:block">
                          <div class="py-1">
                            <button
                              @click.stop="togglePositionFilter(null)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="!gridFilters.position ? 'bg-orange-50 text-orange-700' : 'text-gray-700'"
                            >
                              <span>All Positions</span>
                              <span v-if="!gridFilters.position" class="text-orange-600">✓</span>
                            </button>
                            <div class="border-t border-gray-200 my-1"></div>
                            <button
                              v-for="position in availablePositionTitles"
                              :key="position"
                              @click.stop="togglePositionFilter(position)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="gridFilters.position === position ? 'bg-orange-50 text-orange-700' : 'text-gray-700'"
                            >
                              <span>{{ position }}</span>
                              <span v-if="gridFilters.position === position" class="text-orange-600">✓</span>
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
                          <Filter class="w-3 h-3 opacity-50 group-hover:opacity-100" />
                          <span v-if="gridFilters.branch" class="w-2 h-2 bg-green-600 rounded-full"></span>
                        </div>
                        <!-- Dropdown menu -->
                        <div v-if="availableBranches.length > 0" class="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px] hidden group-hover:block">
                          <div class="py-1">
                            <button
                              @click.stop="toggleBranchFilter(null)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="!gridFilters.branch ? 'bg-green-50 text-green-700' : 'text-gray-700'"
                            >
                              <span>All Branches</span>
                              <span v-if="!gridFilters.branch" class="text-green-600">✓</span>
                            </button>
                            <div class="border-t border-gray-200 my-1"></div>
                            <button
                              v-for="branch in availableBranches"
                              :key="branch"
                              @click.stop="toggleBranchFilter(branch)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="gridFilters.branch === branch ? 'bg-green-50 text-green-700' : 'text-gray-700'"
                            >
                              <span>{{ branch }}</span>
                              <span v-if="gridFilters.branch === branch" class="text-green-600">✓</span>
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
                          <Filter class="w-3 h-3 opacity-50 group-hover:opacity-100" />
                          <span v-if="gridFilters.department" class="w-2 h-2 bg-blue-600 rounded-full"></span>
                        </div>
                        <!-- Dropdown menu -->
                        <div v-if="availableDepartments.length > 0" class="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px] hidden group-hover:block">
                          <div class="py-1">
                            <button
                              @click.stop="toggleDepartmentFilter(null)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="!gridFilters.department ? 'bg-blue-50 text-blue-700' : 'text-gray-700'"
                            >
                              <span>All Departments</span>
                              <span v-if="!gridFilters.department" class="text-blue-600">✓</span>
                            </button>
                            <div class="border-t border-gray-200 my-1"></div>
                            <button
                              v-for="dept in availableDepartments"
                              :key="dept"
                              @click.stop="toggleDepartmentFilter(dept)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="gridFilters.department === dept ? 'bg-blue-50 text-blue-700' : 'text-gray-700'"
                            >
                              <span>{{ dept }}</span>
                              <span v-if="gridFilters.department === dept" class="text-blue-600">✓</span>
                            </button>
                          </div>
                        </div>
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Rate/Hour</th>
                      <th 
                        @click="toggleStatusFilter(null)"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative group"
                      >
                        <div class="flex items-center gap-1">
                          Status
                          <Filter class="w-3 h-3 opacity-50 group-hover:opacity-100" />
                          <span v-if="gridFilters.status" class="w-2 h-2 bg-purple-600 rounded-full"></span>
                        </div>
                        <!-- Dropdown menu -->
                        <div v-if="availableStatuses.length > 0" class="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px] hidden group-hover:block">
                          <div class="py-1">
                            <button
                              @click.stop="toggleStatusFilter(null)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="!gridFilters.status ? 'bg-purple-50 text-purple-700' : 'text-gray-700'"
                            >
                              <span>All Status</span>
                              <span v-if="!gridFilters.status" class="text-purple-600">✓</span>
                            </button>
                            <div class="border-t border-gray-200 my-1"></div>
                            <button
                              v-for="status in availableStatuses"
                              :key="status"
                              @click.stop="toggleStatusFilter(status)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between capitalize"
                              :class="gridFilters.status === status ? 'bg-purple-50 text-purple-700' : 'text-gray-700'"
                            >
                              <span>{{ status }}</span>
                              <span v-if="gridFilters.status === status" class="text-purple-600">✓</span>
                            </button>
                          </div>
                        </div>
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr
                      v-for="position in gridPaginatedPositions"
                      :key="position.id"
                      class="hover:bg-gray-50 transition-colors"
                    >
                      <td 
                        class="px-4 py-3 whitespace-nowrap cursor-pointer"
                        @click.stop="togglePositionStatus(position)"
                      >
                        <div class="font-semibold text-gray-900">{{ position.position_title }}</div>
                        <div class="text-xs text-gray-500 line-clamp-1">{{ position.description || `${position.department} ${position.position_title}` }}</div>
                      </td>
                      <td 
                        class="px-4 py-3 whitespace-nowrap"
                        @click.stop
                      >
                        <div v-if="position.branch_name && position.branch_name !== 'N/A' && position.branch_name.trim() !== ''" class="flex items-center text-sm text-green-600">
                          <svg class="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          <span class="truncate max-w-[200px]">{{ position.branch_name }}</span>
                        </div>
                        <span v-else-if="position.branch_id" class="text-sm text-gray-400 italic">No branch name</span>
                        <span v-else class="text-sm text-green-600 flex items-center">
                          <svg class="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          Main Branch
                        </span>
                      </td>
                      <td 
                        class="px-4 py-3 whitespace-nowrap cursor-pointer"
                        @click.stop="togglePositionStatus(position)"
                      >
                        <span class="text-sm text-gray-600">{{ position.department }}</span>
                      </td>
                      <td 
                        class="px-4 py-3 whitespace-nowrap cursor-pointer"
                        @click.stop="togglePositionStatus(position)"
                      >
                        <span class="text-sm font-semibold text-primaryColor">
                          ₱{{ (parseFloat(position.rate_per_hour) || 0).toFixed(2) }}
                        </span>
                      </td>
                      <td 
                        class="px-4 py-3 whitespace-nowrap cursor-pointer"
                        @click.stop="togglePositionStatus(position)"
                      >
                        <span
                          class="px-2 py-1 text-xs font-medium rounded-full"
                          :class="position.status === 'open' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'"
                        >
                          {{ position.status === 'open' ? 'Open' : 'Closed' }}
                        </span>
                      </td>
                      <td 
                        class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                        @click.stop="togglePositionStatus(position)"
                      >
                        Click to {{ position.status === 'open' ? 'close' : 'open' }}
                      </td>
                    </tr>
                    <tr v-if="gridPaginatedPositions.length === 0">
                      <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                        No positions found matching the filters.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- Pagination Controls -->
              <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div class="text-sm text-gray-600">
                  Showing {{ (gridCurrentPage - 1) * gridItemsPerPage + 1 }} to 
                  {{ Math.min(gridCurrentPage * gridItemsPerPage, gridFilteredPositions.length) }} of 
                  {{ gridFilteredPositions.length }} positions
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
                    @click="gridCurrentPage = Math.min(gridTotalPages, gridCurrentPage + 1)"
                    :disabled="gridCurrentPage >= gridTotalPages"
                    class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <!-- Cards Grid View -->
            <div v-else-if="viewMode === 'card'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-4">
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
                      <h3 class="font-semibold text-black truncate text-sm sm:text-base">
                        {{ position.position_title }}
                      </h3>
                      <div class="space-y-1">
                        <p class="text-xs sm:text-sm text-black/60 truncate">
                          {{ position.department }}
                        </p>
                        <p v-if="position.branch_name && position.branch_name !== 'N/A' && position.branch_name.trim() !== ''" class="text-xs font-medium text-green-600 flex items-center truncate">
                          <svg class="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          {{ position.branch_name }}
                        </p>
                        <p v-else-if="position.branch_id" class="text-xs text-gray-400 italic truncate">No branch name</p>
                        <p v-else class="text-xs font-medium text-green-600 flex items-center truncate">
                          <svg class="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          Main Branch
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Rate per Hour -->
                  <div class="flex justify-between items-center mb-3">
                    <span class="text-xs sm:text-sm text-black/70">Rate per Hour:</span>
                    <span class="font-bold text-sm sm:text-base text-primaryColor">
                        ₱{{ (parseFloat(position.rate_per_hour) || 0).toFixed(2) }}
                        </span>
              </div>
              
                  <!-- Status -->
                  <div class="flex justify-between items-center mb-3">
                    <span class="text-xs sm:text-sm text-black/70">Status:</span>
                    <div
                      class="badge badge-xs sm:badge-sm border-none"
                      :class="position.status === 'open' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'"
                    >
                      {{ position.status === 'open' ? 'Open' : 'Closed' }}
                  </div>
                  </div>

                  <!-- Description -->
                  <div class="text-xs text-black/60 line-clamp-2">
                    {{ position.description || `${position.department} ${position.position_title}` }}
                  </div>

                  <!-- Click to Toggle Status Indicator -->
                  <div class="flex justify-end mt-2">
                    <span class="text-xs text-black/40">
                      Click to {{ position.status === 'open' ? 'close' : 'open' }} position
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card View Pagination -->
            <div v-if="viewMode === 'card'" class="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div class="flex justify-between items-center">
                <div class="text-sm text-gray-600">
                  Showing {{ (cardCurrentPage - 1) * cardItemsPerPage + 1 }} to 
                  {{ Math.min(cardCurrentPage * cardItemsPerPage, filteredPositions.length) }} of 
                  {{ filteredPositions.length }} positions
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
                    @click="cardCurrentPage = Math.min(cardTotalPages, cardCurrentPage + 1)"
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
                    position.status === 'open' ? 'open' : 
                    position.status === 'filled' ? 'filled' : 'on-hold'
                  ]"
                >
                  {{ position.status.charAt(0).toUpperCase() + position.status.slice(1) }}
                </div>
              </div>
              
              <div class="position-details">
                <div class="detail-item">
                  <span class="detail-label">Branch:</span>
                  <span class="detail-value">{{ position.branch_name || 'Not specified' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Department:</span>
                  <span class="detail-value">{{ position.department || 'Not specified' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Rate per Hour:</span>
                  <span class="detail-value">₱{{ position.rate_per_hour || 0 }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Monthly Salary:</span>
                  <span class="detail-value">₱{{ position.monthly_salary || 0 }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Position Type:</span>
                  <span class="detail-value">{{ position.position_type || 'Full-time' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Created:</span>
                  <span class="detail-value">{{ formatDate(position.created_at) }}</span>
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
              <p class="text-gray-600">Start by adding your first job position</p>
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



      <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-bold text-gray-900">
            {{ editingPosition ? 'Edit Job Opening' : 'Post New Job Opening' }}
          </h3>
          <button @click="closePositionModal" class="text-gray-400 hover:text-gray-600">
            <X class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="savePosition" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left Column -->
            <div class="space-y-4">
              <!-- Job Title -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                <input
                  v-model="positionForm.position_title"
                  type="text"
                  required
                  placeholder="e.g., Cashier, Cook, Manager"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <!-- Position Code -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Position Code *</label>
                <input
                  v-model="positionForm.position_code"
                  type="text"
                  required
                  placeholder="e.g., CASH, COOK"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <!-- Work Type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Work Type *</label>
                <select
                  v-model="positionForm.position_type"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Work Type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>

            </div>

            <!-- Right Column -->
            <div class="space-y-4">
              <!-- Department -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                <select
                  v-model="positionForm.department"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  @change="positionForm.position_title = ''; positionForm.rate_per_hour = 0"
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

              <!-- Position/Role Selection (only for non-Branch departments) -->
              <div v-if="positionForm.department && positionForm.department !== 'Branch' && availableRolesForDepartment.length > 0">
                <label class="block text-sm font-medium text-gray-700 mb-2">Position/Role *</label>
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
                  Select from available positions in {{ positionForm.department }}
                  <span class="text-green-600 font-medium">({{ availableRolesForDepartment.length }} available)</span>
                </p>
              </div>

              <!-- Debug info for department selection -->
              <div v-if="positionForm.department && positionForm.department !== 'Branch' && !availableRolesForDepartment.length" class="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ No positions found for {{ positionForm.department }}. Please check Position Management first.
              </div>

              <!-- Rate per Hour -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Rate per Hour (₱) *</label>
                <input
                  v-model.number="positionForm.rate_per_hour"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="50.00"
                  :readonly="positionForm.department && positionForm.department !== 'Branch' && availableRolesForDepartment.length > 0"
                  :class="[
                    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent',
                    positionForm.department && positionForm.department !== 'Branch' && availableRolesForDepartment.length > 0 ? 'bg-gray-100 cursor-not-allowed' : ''
                  ]"
                />
                <p v-if="positionForm.department && positionForm.department !== 'Branch'" class="text-xs text-gray-500 mt-1">
                  {{ positionForm.rate_per_hour > 0 ? 'Rate from Position Management' : 'Select a position to auto-fill rate' }}
                </p>
              </div>

              <!-- Calculated Monthly Salary -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Monthly Salary</label>
                <div class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium">
                  ₱{{ calculatedMonthlySalary.toFixed(2) }}
                </div>
              </div>

              <!-- Status -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                <select
                  v-model="positionForm.status"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="open">Open</option>
                  <option value="filled">Filled</option>
                  <option value="on-hold">On Hold</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
            <textarea
              v-model="positionForm.description"
              rows="4"
              placeholder="Describe the role, responsibilities, and requirements..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            ></textarea>
          </div>

          <!-- Requirements -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
            <textarea
              v-model="positionForm.requirements"
              rows="3"
              placeholder="List the required skills, experience, and qualifications..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            ></textarea>
          </div>

          <!-- Form Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              @click="closePositionModal"
              class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSavingPosition"
              class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <span v-if="isSavingPosition" class="loading loading-spinner loading-sm"></span>
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
    <div v-if="showDeleteModal" class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <div class="flex items-center">
            <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <Trash2 class="w-5 h-5 text-red-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900">Delete Application</h3>
          </div>
          <button @click="showDeleteModal = false" class="text-gray-400 hover:text-gray-600 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <p class="text-gray-600 mb-4">
            Are you sure you want to delete this application? This action cannot be undone and will permanently remove all application data.
          </p>
          
          <!-- Application Preview -->
          <div v-if="applicationToDelete" class="bg-gray-50 rounded-lg p-4 mb-6">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <span class="text-green-600 font-semibold text-sm">
                  {{ applicationToDelete.full_name?.charAt(0) || 'A' }}
                </span>
              </div>
              <div>
                <h4 class="font-medium text-gray-900">{{ applicationToDelete.full_name }}</h4>
                <p class="text-sm text-gray-500">{{ applicationToDelete.email }}</p>
                <p class="text-sm text-gray-500">{{ applicationToDelete.position_name }} • {{ applicationToDelete.location }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button 
            @click="showDeleteModal = false"
            class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="confirmDelete"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center"
          >
            <Trash2 class="w-4 h-4 mr-2" />
            Delete Application
          </button>
        </div>
      </div>
    </div>

    <!-- Interview Delete Confirmation Modal -->
    <div v-if="showInterviewDeleteModal" class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <div class="flex items-center">
            <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <Trash2 class="w-5 h-5 text-red-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900">Delete Interview</h3>
          </div>
          <button @click="showInterviewDeleteModal = false; interviewToDelete = null" class="text-gray-400 hover:text-gray-600 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <p class="text-gray-600 mb-4">
            Are you sure you want to delete this interview? This action cannot be undone and will permanently remove all interview data.
          </p>
          
          <!-- Interview Preview -->
          <div v-if="interviewToDelete" class="bg-gray-50 rounded-lg p-4 mb-6">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <Calendar class="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 class="font-medium text-gray-900">{{ interviewToDelete.applicant_name }}</h4>
                <p class="text-sm text-gray-500">{{ interviewToDelete.position_title }}</p>
                <p class="text-sm text-gray-500">{{ formatDate(interviewToDelete.interview_date) }} at {{ formatTime(interviewToDelete.interview_time) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button 
            @click="showInterviewDeleteModal = false; interviewToDelete = null"
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
    <div v-if="showNotificationModal" class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-in slide-in-from-bottom-4 duration-300">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <div class="flex items-center">
            <div :class="[
              'w-10 h-10 rounded-full flex items-center justify-center mr-3',
              notificationData.type === 'success' ? 'bg-green-100' : 'bg-red-100'
            ]">
              <CheckCircle v-if="notificationData.type === 'success'" class="w-5 h-5 text-green-600" />
              <AlertTriangle v-else class="w-5 h-5 text-red-600" />
            </div>
            <h3 :class="[
              'text-lg font-semibold',
              notificationData.type === 'success' ? 'text-green-900' : 'text-red-900'
            ]">
              {{ notificationData.title }}
            </h3>
          </div>
          <button @click="showNotificationModal = false" class="text-gray-400 hover:text-gray-600 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <p :class="[
            'text-gray-700',
            notificationData.type === 'success' ? 'text-green-800' : 'text-red-800'
          ]">
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
                : 'bg-red-600 hover:bg-red-700 text-white'
            ]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
    
    <!-- Interview Details Modal -->
    <div v-if="showInterviewDetailsModal" class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <div class="flex items-center">
            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <Eye class="w-5 h-5 text-blue-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900">Interview Details</h3>
          </div>
          <button @click="showInterviewDetailsModal = false" class="text-gray-400 hover:text-gray-600 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div class="text-xs uppercase text-gray-500 mb-1">Applicant Name</div>
              <div class="text-gray-900 font-medium">{{ selectedInterview?.applicant_name }}</div>
            </div>
            <div>
              <div class="text-xs uppercase text-gray-500 mb-1">Position</div>
              <div class="text-gray-900">{{ selectedInterview?.position_title }}</div>
            </div>
            <div class="flex items-center gap-2">
              <Calendar class="w-4 h-4 text-blue-600" />
              <div>
                <div class="text-xs uppercase text-gray-500">Date</div>
                <div class="text-gray-900">{{ formatDate(selectedInterview?.interview_date) }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Clock class="w-4 h-4 text-blue-600" />
              <div>
                <div class="text-xs uppercase text-gray-500">Time</div>
                <div class="text-gray-900">{{ formatTime(selectedInterview?.interview_time) }}</div>
              </div>
            </div>
            <div>
              <div class="text-xs uppercase text-gray-500 mb-1">Type</div>
              <div class="text-gray-900 capitalize">{{ selectedInterview?.interview_type }}</div>
            </div>
            <div>
              <div class="text-xs uppercase text-gray-500 mb-1">Status</div>
              <div class="text-gray-900 capitalize">{{ selectedInterview?.status }}</div>
            </div>
          </div>
          <div v-if="selectedInterview?.location && selectedInterview?.interview_type === 'in-person'" class="flex items-center gap-2">
            <MapPin class="w-4 h-4 text-green-600" />
            <div>
              <div class="text-xs uppercase text-gray-500">Location</div>
              <div class="text-gray-900">{{ selectedInterview.location }}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button @click="showInterviewDetailsModal = false" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            OK
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  FileUser, Plus, Download, Calendar, Users, Target, CheckCircle,
  Inbox, Clock, UserCheck, MapPin, Eye, Search, X, AlertTriangle, RefreshCw, Filter,
  SquarePen, CircleX, Building2, Trash2, LayoutGrid, List
} from 'lucide-vue-next'
import JobApplicationDetailsModal from '../../components/crm/JobApplicationDetailsModal.vue'
import SetInterviewModal from '../../components/crm/SetInterviewModal.vue'
import { usePositionsStore } from '../../stores/positionsStore.js'

export default {
  name: 'JobApplication',
  components: {
    FileUser, Plus, Download, Calendar, Users, Target, CheckCircle,
    Inbox, Clock, UserCheck, MapPin, Eye, Search, X, AlertTriangle, RefreshCw, Filter,
    SquarePen, CircleX, Building2, Trash2, LayoutGrid, List,
    JobApplicationDetailsModal,
    SetInterviewModal
  },
  setup() {
    const router = useRouter()
    const positionsStore = usePositionsStore()
    
    // Active tab - default to position-tracker for public access
    const activeTab = ref('position-tracker')
    
    // Active department for filtering
    const activeDepartment = ref('All')
    
    // View mode - grid (default) or card
    const viewMode = ref('grid') // 'grid' or 'card'
    
    // Grid view filters
    const gridFilters = ref({
      position: null,
      branch: null,
      department: null,
      status: null
    })
    
    // Grid view pagination
    const gridCurrentPage = ref(1)
    const gridItemsPerPage = ref(10)
    
    // Card view pagination
    const cardCurrentPage = ref(1)
    const cardItemsPerPage = ref(12)

    // Tab configuration
    const tabs = ref([
      {
        id: 'new-applications',
        name: 'New Applications',
        icon: Inbox
      },
      {
        id: 'interview-schedule',
        name: 'Interview Schedule',
        icon: Calendar
      },
      {
        id: 'position-tracker',
        name: 'Job Listing',
        icon: Target
      },
    ])

    // Statistics data - will be populated from API
    const screenedCount = ref(0)
    const processedCount = ref(0)

    // Application data - will be populated from API
    const applications = ref([])
    const branchPositions = ref([]) // Separate branch positions from API
    const rolesPositionsData = ref({}) // Store roles/positions data by department
    
    // Computed property that merges branch positions with store positions (reactive to store changes)
    const positions = computed(() => {
      // Get department positions from store (grouped by department)
      const storePositions = []
      for (const department in positionsStore.positions) {
        const deptPositions = positionsStore.positions[department] || []
        deptPositions.forEach(role => {
          storePositions.push({
            id: `dept-${role.role_id}`,
            position_title: role.role,
            position_code: role.role_code || '',
            department: role.department || 'Department',
            position_type: 'Full-time',
            rate_per_hour: parseFloat(role.rate_per_hour) || 0,
            status: role.is_active ? 'open' : 'closed',
            description: role.description || '',
            requirements: role.requirements || '',
            role_id: role.role_id, // Keep reference for rate updates
            branch_id: null, // Department roles don't have a branch
            branch_name: null
          })
        })
      }
      
      // Merge with branch positions (branch positions already include branch_name from API)
      return [...branchPositions.value, ...storePositions]
    })
    const searchQuery = ref('')
    const statusFilter = ref('')
    const positionFilter = ref('')
    const dateFilter = ref('')
    const currentPage = ref(1)
    const itemsPerPage = ref(10)

    // Delete modal state
    const showDeleteModal = ref(false)
    const applicationToDelete = ref(null)

    // Interview delete confirmation modal state
    const showInterviewDeleteModal = ref(false)
    const interviewToDelete = ref(null)

    // Notification modal state (for success/error messages)
    const showNotificationModal = ref(false)
    const notificationData = ref({
      type: 'success', // 'success' or 'error'
      title: '',
      message: ''
    })
    const isLoadingApplications = ref(false)

    // Modal state
    const showApplicationDetailsModal = ref(false)
    const showSetInterviewModal = ref(false)
    const selectedApplication = ref(null)

    // Interview management state
    const interviews = ref([])
    const isLoadingInterviews = ref(false)
    const isUpdatingInterview = ref(false)
    const interviewFilter = ref('all') // all, today, this-week, this-month

    // Position management state
    const showAddPositionModal = ref(false)
    const editingPosition = ref(null)
    const isLoadingPositions = ref(false)
    const isSavingPosition = ref(false)
    const branches = ref([])
    const isLoadingBranches = ref(false)

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
      linked_position_id: '' // If linking to existing position
    })

    // Computed properties
    const calculatedMonthlySalary = computed(() => {
      const rate = positionForm.value.rate_per_hour || 0
      return rate * 160 // Fixed 160 hours per month for all positions
    })

    // Helper function to calculate monthly salary range (6-8 hours per day)
    const getMonthlySalaryRange = (ratePerHour) => {
      const rate = parseFloat(ratePerHour) || 0
      // 6 hours per day * 30 days per month (average)
      const minSalary = rate * 6 * 30
      // 8 hours per day * 30 days per month (average)
      const maxSalary = rate * 8 * 30
      
      // Round to nearest thousand
      const minRounded = Math.round(minSalary / 1000) * 1000
      const maxRounded = Math.round(maxSalary / 1000) * 1000
      
      return {
        min: minRounded,
        max: maxRounded,
        display: `₱${minRounded.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} - ₱${maxRounded.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
      }
    }

    const totalMonthlySalaryBudget = computed(() => {
      return positions.value.reduce((total, position) => {
        return total + (parseFloat(position.monthly_salary) || 0)
      }, 0)
    })

    // Available positions for linking
    const availablePositions = computed(() => {
      if (positionForm.value.assignment_type === 'branch') {
        // Show only branch positions
        return positions.value.filter(p => p.branch_id && p.branch_id !== '')
      } else if (positionForm.value.assignment_type === 'department') {
        // Show only department positions
        return positions.value.filter(p => !p.branch_id || p.branch_id === '')
      }
      return []
    })

    // Get available positions for the selected department
    const availableRolesForDepartment = computed(() => {
      if (!positionForm.value.department || !rolesPositionsData.value[positionForm.value.department]) {
        return []
      }
      return rolesPositionsData.value[positionForm.value.department]
    })

    // Get unique departments from positions
    const departments = computed(() => {
      // Default departments we always want to show as tabs
      const defaultDepartments = ['Branch', 'Human Resource', 'Finance', 'SCM', 'Production', 'CRM']
      const deptSet = new Set([
        ...defaultDepartments,
        ...positions.value.map(p => p.department).filter(Boolean)
      ])
      return ['All', ...Array.from(deptSet).sort((a, b) => a.localeCompare(b))]
    })

    // Filter positions by department (show all positions for HR management)
    const filteredPositions = computed(() => {
      // In Job Listing tab, show all positions (open and closed) so HR can manage them
      let filtered = positions.value.filter(p => p.is_active !== false && !p.deleted_at)
      
      // Apply department filter from tabs
      if (activeDepartment.value !== 'All') {
        filtered = filtered.filter(p => p.department === activeDepartment.value)
      }
      
      return filtered
    })
    
    // Grid view filtered positions (with additional grid-specific filters)
    const gridFilteredPositions = computed(() => {
      let filtered = [...filteredPositions.value]
      
      // Apply position filter
      if (gridFilters.value.position) {
        filtered = filtered.filter(p => 
          p.position_title && p.position_title.trim() === gridFilters.value.position
        )
      }
      
      // Apply branch filter
      if (gridFilters.value.branch) {
        if (gridFilters.value.branch === 'Main Branch') {
          // Filter for Main Branch positions (no branch_id or branch_name)
          filtered = filtered.filter(p => 
            !p.branch_id || 
            !p.branch_name || 
            p.branch_name.trim() === '' || 
            p.branch_name === 'N/A'
          )
        } else {
          // Filter for specific branch
          filtered = filtered.filter(p => 
            p.branch_name === gridFilters.value.branch || 
            p.branch_id === gridFilters.value.branch
          )
        }
      }
      
      // Apply department filter (if not already filtered by tabs)
      if (gridFilters.value.department && activeDepartment.value === 'All') {
        filtered = filtered.filter(p => p.department === gridFilters.value.department)
      }
      
      // Apply status filter
      if (gridFilters.value.status) {
        filtered = filtered.filter(p => p.status === gridFilters.value.status)
      }
      
      return filtered
    })
    
    // Grid view paginated positions
    const gridPaginatedPositions = computed(() => {
      const start = (gridCurrentPage.value - 1) * gridItemsPerPage.value
      const end = start + gridItemsPerPage.value
      return gridFilteredPositions.value.slice(start, end)
    })
    
    // Grid view total pages
    const gridTotalPages = computed(() => {
      return Math.ceil(gridFilteredPositions.value.length / gridItemsPerPage.value)
    })
    
    // Card view paginated positions
    const cardPaginatedPositions = computed(() => {
      const start = (cardCurrentPage.value - 1) * cardItemsPerPage.value
      const end = start + cardItemsPerPage.value
      return filteredPositions.value.slice(start, end)
    })
    
    // Card view total pages
    const cardTotalPages = computed(() => {
      return Math.ceil(filteredPositions.value.length / cardItemsPerPage.value)
    })
    
    // Get unique values for filters
    const availableBranches = computed(() => {
      const branches = new Set()
      let hasMainBranch = false
      
      filteredPositions.value.forEach(p => {
        // Check if this is a Main Branch position (no branch_id or no branch_name)
        if (!p.branch_id || !p.branch_name || p.branch_name.trim() === '' || p.branch_name === 'N/A') {
          hasMainBranch = true
        }
        // Include actual branch positions (those with branch_name and branch_id)
        else if (p.branch_name && p.branch_name.trim() !== '' && p.branch_name !== 'N/A' && p.branch_id) {
          branches.add(p.branch_name.trim())
        }
      })
      
      // Add "Main Branch" as the first option if there are any department positions
      const branchList = hasMainBranch ? ['Main Branch'] : []
      branchList.push(...Array.from(branches).sort())
      
      return branchList
    })
    
    const availableDepartments = computed(() => {
      const depts = new Set()
      filteredPositions.value.forEach(p => {
        if (p.department) depts.add(p.department)
      })
      return Array.from(depts).sort()
    })
    
    const availableStatuses = computed(() => {
      const statuses = new Set()
      filteredPositions.value.forEach(p => {
        if (p.status) statuses.add(p.status)
      })
      return Array.from(statuses).sort()
    })
    
    const availablePositionTitles = computed(() => {
      const positions = new Set()
      filteredPositions.value.forEach(p => {
        if (p.position_title) positions.add(p.position_title.trim())
      })
      return Array.from(positions).sort()
    })
    
    // Methods for grid filters
    const togglePositionFilter = (position) => {
      if (gridFilters.value.position === position) {
        gridFilters.value.position = null
      } else {
        gridFilters.value.position = position
      }
      gridCurrentPage.value = 1 // Reset to first page
    }
    
    const toggleBranchFilter = (branch) => {
      if (gridFilters.value.branch === branch) {
        gridFilters.value.branch = null
      } else {
        gridFilters.value.branch = branch
      }
      gridCurrentPage.value = 1 // Reset to first page
    }
    
    const toggleDepartmentFilter = (department) => {
      if (gridFilters.value.department === department) {
        gridFilters.value.department = null
      } else {
        gridFilters.value.department = department
      }
      gridCurrentPage.value = 1
    }
    
    const toggleStatusFilter = (status) => {
      if (gridFilters.value.status === status) {
        gridFilters.value.status = null
      } else {
        gridFilters.value.status = status
      }
      gridCurrentPage.value = 1
    }
    
    const clearGridFilters = () => {
      gridFilters.value = {
        position: null,
        branch: null,
        department: null,
        status: null
      }
      gridCurrentPage.value = 1
    }
    
    const hasActiveGridFilters = computed(() => {
      return gridFilters.value.position || gridFilters.value.branch || gridFilters.value.department || gridFilters.value.status
    })

    // Filter positions by department (helper function for tabs)
    const filteredPositionsByDepartment = (department) => {
      // Show all positions (open and closed) for HR management
      let filtered = positions.value.filter(p => p.is_active !== false && !p.deleted_at)
      
      if (department === 'All') {
        return filtered
      }
      return filtered.filter(p => p.department === department)
    }

    const filteredApplications = computed(() => {
      let filtered = applications.value || []
      
      // Search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(app => 
          app.applicant_name.toLowerCase().includes(query) ||
          app.email.toLowerCase().includes(query) ||
          app.position_title.toLowerCase().includes(query)
        )
      }
      
      // Status filter
      if (statusFilter.value) {
        filtered = filtered.filter(app => app.status === statusFilter.value)
      }
      
      // Position filter
      if (positionFilter.value) {
        filtered = filtered.filter(app => app.position_id === positionFilter.value)
      }
      
      return filtered
    })

    const totalPages = computed(() => {
      // Get filtered applications count based on active tab
      let filteredApps = applications.value
      
      if (activeTab.value === 'new-applications') {
        filteredApps = applications.value.filter(app => 
          app.status === 'new' || app.status === 'reviewing'
        )
      }
      
      return Math.ceil(filteredApps.length / itemsPerPage.value)
    })

    const paginatedApplications = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      
      // Filter applications based on active tab
      let filteredApps = applications.value
      
      if (activeTab.value === 'new-applications') {
        // Only show truly new applications (new, reviewing) - exclude interview-scheduled, rejected, hired
        filteredApps = applications.value.filter(app => 
          app.status === 'new' || app.status === 'reviewing'
        )
      }
      
      return filteredApps.slice(start, end)
    })
    
    const visiblePages = computed(() => {
      const pages = []
      const total = totalPages.value
      const current = currentPage.value
      
      if (total <= 7) {
        for (let i = 1; i <= total; i++) {
          pages.push(i)
        }
      } else {
        if (current <= 4) {
          for (let i = 1; i <= 5; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(total)
        } else if (current >= total - 3) {
          pages.push(1)
          pages.push('...')
          for (let i = total - 4; i <= total; i++) {
            pages.push(i)
          }
        } else {
          pages.push(1)
          pages.push('...')
          for (let i = current - 1; i <= current + 1; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(total)
        }
      }
      
      return pages.filter(page => page !== '...')
    })
    
    const selectAll = computed(() => {
      return paginatedApplications.value.length > 0 && 
             paginatedApplications.value.every(app => app.selected)
    })
    
    const newApplicationsCount = computed(() => {
      return applications.value.filter(app => app.status === 'new').length
    })
    
    const pendingReviewCount = computed(() => {
      return applications.value.filter(app => app.status === 'reviewing').length
    })

    const getFilteredApplicationsCount = () => {
      if (activeTab.value === 'new-applications') {
        return applications.value.filter(app => 
          app.status === 'new' || app.status === 'reviewing'
        ).length
      }
      return applications.value.length
    }

    // Filter interviews based on selected filter
    const filteredInterviews = computed(() => {
      let filtered = interviews.value || []
      
      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 7)
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      
      switch (interviewFilter.value) {
        case 'today':
          filtered = filtered.filter(interview => {
            const interviewDate = new Date(interview.interview_date)
            return interviewDate >= startOfToday && interviewDate < endOfToday
          })
          break
        case 'this-week':
          filtered = filtered.filter(interview => {
            const interviewDate = new Date(interview.interview_date)
            return interviewDate >= startOfWeek && interviewDate < endOfWeek
          })
          break
        case 'this-month':
          filtered = filtered.filter(interview => {
            const interviewDate = new Date(interview.interview_date)
            return interviewDate >= startOfMonth && interviewDate < endOfMonth
          })
          break
        case 'all':
        default:
          // No filtering
          break
      }
      
      return filtered
    })

    // Methods
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      
      // Handle date string format
      let date
      if (typeof dateString === 'string') {
        // If it's already a full ISO date string (has T), use it as-is
        if (dateString.includes('T') || dateString.includes(' ')) {
          date = new Date(dateString)
        } else if (dateString.includes('-')) {
          // If it's a date-only string (YYYY-MM-DD), add time to avoid timezone issues
          date = new Date(dateString + 'T00:00:00')
        } else {
          date = new Date(dateString)
        }
      } else {
        date = new Date(dateString)
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // If invalid, return original string
        return String(dateString)
      }
      
      // Format date in Philippines timezone (GMT+8)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Manila'
      }).format(date)
    }

    const formatTime = (timeString) => {
      if (!timeString) return 'N/A'
      
      // If timeString is already in HH:MM format, convert to 12-hour format
      if (typeof timeString === 'string' && /^\d{1,2}:\d{2}/.test(timeString)) {
        const [hours, minutes] = timeString.split(':')
        const hour24 = parseInt(hours, 10)
        const hour12 = hour24 === 0 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24)
        const ampm = hour24 >= 12 ? 'PM' : 'AM'
        return `${hour12}:${minutes.padStart(2, '0')} ${ampm}`
      }
      
      // Try to parse as date/time
      const date = new Date(timeString)
      if (isNaN(date.getTime())) {
        return timeString
      }
      
      // Format time in Philippines timezone (GMT+8) with 12-hour format
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true, // Use 12-hour format (AM/PM)
        timeZone: 'Asia/Manila'
      }).format(date)
    }

    const toggleSelectAll = () => {
      const shouldSelect = !selectAll.value
      applications.value.forEach(app => {
        app.selected = shouldSelect
      })
    }

    const markAllAsReviewed = () => {
      applications.value.forEach(app => {
        if (app.selected) {
          app.status = 'reviewing'
        }
      })
    }

    const viewApplication = (application) => {
      selectedApplication.value = application
      showApplicationDetailsModal.value = true
    }

    const setInterviewDate = (application) => {
      selectedApplication.value = application
      showSetInterviewModal.value = true
    }

    const closeApplicationDetailsModal = () => {
      showApplicationDetailsModal.value = false
      selectedApplication.value = null
    }

    const closeSetInterviewModal = () => {
      showSetInterviewModal.value = false
      selectedApplication.value = null
    }

    const handleInterviewScheduled = (interviewData) => {
      console.log('Interview scheduled:', interviewData)
      // Reload applications to show updated status
      loadApplications()
    }

    const handleNavigateToSchedule = () => {
      // Switch to interview schedule tab
      activeTab.value = 'interview-schedule'
      // Reload interviews to show the newly scheduled one
      loadInterviews()
    }

    // Interview management methods
    const conductInterview = async (interview, result) => {
      try {
        isUpdatingInterview.value = true
        
        const response = await fetch(`/api/job-applications/interviews/${interview.id}/status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            status: 'completed',
            result: result // 'passed' or 'failed'
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update interview status')
        }

        const result_data = await response.json()
        
        if (result_data.success) {
          // Update local interview status
          const index = interviews.value.findIndex(i => i.id === interview.id)
          if (index !== -1) {
            interviews.value[index].status = 'completed'
            interviews.value[index].result = result
          }
          
          // Update application status based on interview result
          await updateApplicationStatusFromInterview(interview.application_id, result)
          
          // Reload interviews to get the latest data from the database
          await loadInterviews()
          
          alert(`Interview ${result === 'passed' ? 'passed successfully!' : 'failed. Application rejected.'}`)
        } else {
          throw new Error(result_data.message || 'Failed to update interview')
        }
      } catch (error) {
        console.error('Error conducting interview:', error)
        alert(`Failed to update interview: ${error.message}`)
      } finally {
        isUpdatingInterview.value = false
      }
    }

    const updateApplicationStatusFromInterview = async (applicationId, result) => {
      try {
        const newStatus = result === 'passed' ? 'hired' : 'rejected'
        
        const response = await fetch(`/api/job-applications/${applicationId}/status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        })

        if (!response.ok) {
          throw new Error('Failed to update application status')
        }

        const result_data = await response.json()
        
        if (result_data.success) {
          // Update local application status
          const index = applications.value.findIndex(app => app.id === applicationId)
          if (index !== -1) {
            applications.value[index].status = newStatus
          }
        }
      } catch (error) {
        console.error('Error updating application status:', error)
      }
    }

    // Interview details modal
    const showInterviewDetailsModal = ref(false)
    const selectedInterview = ref(null)

    const viewInterviewDetails = (interview) => {
      selectedInterview.value = interview
      showInterviewDetailsModal.value = true
    }

    const rescheduleInterview = (interview) => {
      // TODO: Implement reschedule functionality
      console.log('Rescheduling interview:', interview)
      alert('Reschedule functionality will be implemented soon.')
    }

    // Helper function to show notification
    const showNotification = (type, title, message) => {
      notificationData.value = { type, title, message }
      showNotificationModal.value = true
      // Auto-close after 3 seconds for success messages
      if (type === 'success') {
        setTimeout(() => {
          showNotificationModal.value = false
        }, 3000)
      }
    }

    const cancelInterview = (interview) => {
      interviewToDelete.value = interview
      showInterviewDeleteModal.value = true
    }

    const confirmInterviewDelete = async () => {
      if (!interviewToDelete.value) return

      try {
        isUpdatingInterview.value = true
        
        const response = await fetch(`/api/job-applications/interviews/${interviewToDelete.value.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to delete interview')
        }

        const result_data = await response.json()
        
        if (result_data.success) {
          // Remove interview from local list
          const index = interviews.value.findIndex(i => i.id === interviewToDelete.value.id)
          if (index !== -1) {
            interviews.value.splice(index, 1)
          }
          
          // Close modal and show success notification
          showInterviewDeleteModal.value = false
          interviewToDelete.value = null
          showNotification('success', 'Success!', 'Interview deleted successfully!')
        } else {
          throw new Error(result_data.message || 'Failed to delete interview')
        }
      } catch (error) {
        console.error('Error deleting interview:', error)
        showNotification('error', 'Error', `Failed to delete interview: ${error.message}`)
      } finally {
        isUpdatingInterview.value = false
      }
    }

    const rejectApplication = (application) => {
      applicationToDelete.value = application
      showDeleteModal.value = true
    }

    const confirmDelete = async () => {
      if (!applicationToDelete.value) return

      try {
        const response = await fetch(`/api/job-applications/${applicationToDelete.value.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to delete application')
        }

        // Remove from local applications list
        const index = applications.value.findIndex(app => app.id === applicationToDelete.value.id)
        if (index > -1) {
          applications.value.splice(index, 1)
        }

        // Close modal and reset
        showDeleteModal.value = false
        applicationToDelete.value = null

        showNotification('success', 'Success!', 'Application deleted successfully!')
      } catch (error) {
        console.error('Error deleting application:', error)
        showNotification('error', 'Error', `Failed to delete application: ${error.message}`)
      }
    }
    const handleTabClick = (tabId) => {
      // For all tabs, just switch the active tab content
      activeTab.value = tabId
    }
    
    const clearFilters = () => {
      searchQuery.value = ''
      statusFilter.value = ''
      positionFilter.value = ''
      dateFilter.value = ''
      currentPage.value = 1
    }

    // Position management methods
    const addPosition = () => {
      editingPosition.value = null
      resetPositionForm()
      showAddPositionModal.value = true
    }

    const editPosition = (position) => {
      console.log('Editing position:', position) // Debug log
      console.log('Available branches:', branches.value) // Debug log
      editingPosition.value = position
      positionForm.value = {
        branch_id: position.branch_id || '',
        position_title: position.position_title || '',
        position_code: position.position_code || '',
        department: position.department || '',
        position_type: position.position_type || 'Full-time',
        rate_per_hour: position.rate_per_hour || 0,
        status: position.status || 'open',
        description: position.description || '',
        requirements: position.requirements || '',
        assignment_type: 'new', // Always 'new' when editing
        linked_position_id: ''
      }
      console.log('Form data:', positionForm.value) // Debug log
      console.log('Form branch_id:', positionForm.value.branch_id) // Debug log
      showAddPositionModal.value = true
    }

    const deletePosition = async (positionId) => {
      if (confirm('Are you sure you want to delete this position? This action cannot be undone.')) {
        try {
          const response = await fetch(`/api/branch-positions/${positionId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error('Failed to delete position')
          }

          // Remove from local array (branch positions only)
          branchPositions.value = branchPositions.value.filter(p => p.id !== positionId)
          
          // Show success message
          console.log('Position deleted successfully')
        } catch (error) {
          console.error('Error deleting position:', error)
          alert('Failed to delete position. Please try again.')
        }
      }
    }

    const togglePositionStatus = async (position) => {
      try {
        let response
        let responseData
        let isDepartmentPosition = false

        // Check if this is a department position
        if (position.id && position.id.toString().startsWith('dept-')) {
          isDepartmentPosition = true
          
          // Extract role_id from dept-{role_id} format
          const roleId = position.id.toString().replace('dept-', '')
          
          // Also check if position has role_id property
          const actualRoleId = position.role_id || roleId
          
          if (!actualRoleId || isNaN(actualRoleId)) {
            console.error('Invalid department position - missing role_id:', position)
            alert('Invalid department position ID. Cannot update status.')
            return
          }

          // Toggle is_active for department position
          // If status is 'open' (is_active = true), set is_active to false (close it)
          // If status is 'closed' (is_active = false), set is_active to true (open it)
          const currentIsActive = position.is_active !== undefined ? position.is_active : (position.status === 'open')
          const newIsActive = !currentIsActive
          
          console.log('Updating department position status:', { 
            roleId: actualRoleId, 
            currentIsActive, 
            newIsActive, 
            currentStatus: position.status,
            fullPosition: position 
          })
          
          response = await fetch(`/api/roles/positions/${actualRoleId}/status`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: newIsActive })
          })

          // Check content type before parsing JSON
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text()
            throw new Error(`Invalid response from server: ${text.substring(0, 100)}`)
          }

          responseData = await response.json()

          if (!response.ok) {
            console.error('API Error Response:', responseData)
            throw new Error(responseData.message || 'Failed to update department position status')
          }

          // Refresh store to sync changes (computed property will update automatically)
          await positionsStore.fetchPositions()
          console.log(`Department position status updated to ${responseData.data.is_active ? 'open' : 'closed'}`)
        } else {
          // Handle branch position
          if (!position.id || isNaN(position.id)) {
            alert('Invalid position ID. Cannot update status.')
            return
          }

          const newStatus = position.status === 'open' ? 'closed' : 'open'
          
          console.log('Updating branch position status:', { id: position.id, currentStatus: position.status, newStatus, fullPosition: position })
          
          response = await fetch(`/api/branch-positions/${position.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
          })

          // Check content type before parsing JSON
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text()
            throw new Error(`Invalid response from server: ${text.substring(0, 100)}`)
          }

          responseData = await response.json()

          console.log('Branch position update response:', responseData)
          console.log('Response data.status:', responseData.data?.status)
          console.log('Expected new status:', newStatus)

          if (!response.ok) {
            console.error('API Error Response:', responseData)
            throw new Error(responseData.message || 'Failed to update position status')
          }

          // Update local array with the returned data
          // Update branch positions array with synced fields
          const index = branchPositions.value.findIndex(p => p.id === position.id)
          if (index !== -1) {
            const updatedStatus = responseData.data?.status || newStatus
            const updatedJobStatus = responseData.data?.job_status || updatedStatus
            const updatedIsActive = responseData.data?.is_active !== undefined ? responseData.data.is_active : (updatedStatus === 'open')
            console.log('Setting position status to:', { status: updatedStatus, job_status: updatedJobStatus, is_active: updatedIsActive })
            branchPositions.value[index] = { 
              ...branchPositions.value[index], 
              ...responseData.data,
              status: updatedStatus, // Explicitly set status from response
              job_status: updatedJobStatus, // Also sync job_status
              is_active: updatedIsActive // Also sync is_active
            }
            console.log(`Branch position status updated to ${updatedStatus}`)
            console.log(`Branch position job_status synced to ${updatedJobStatus}`)
            console.log(`Branch position is_active synced to ${updatedIsActive}`)
            console.log('Final position data:', branchPositions.value[index])
          }
        }
      } catch (error) {
        console.error('Error updating position status:', error)
        alert(error.message || 'Failed to update position status. Please try again.')
      }
    }

    const savePosition = async () => {
      try {
        isSavingPosition.value = true
        
        // Prepare the position data
        let positionData = { ...positionForm.value }
        
        // If linking to an existing position, load its data
        if (positionForm.value.assignment_type !== 'new' && positionForm.value.linked_position_id) {
          const linkedPosition = positions.value.find(p => p.id === positionForm.value.linked_position_id)
          if (linkedPosition) {
            // Use linked position data for title, code, and other basic fields
            positionData.position_title = linkedPosition.position_title
            positionData.position_code = linkedPosition.position_code
            // Keep the newly entered rate and other override fields
          }
        }
        
        // Clean up the assignment fields before sending
        delete positionData.assignment_type
        delete positionData.linked_position_id
        
        const url = editingPosition.value 
          ? `/api/branch-positions/${editingPosition.value.id}`
          : '/api/branch-positions'
        
        const method = editingPosition.value ? 'PUT' : 'POST'
        
        const response = await fetch(url, {
          method: method,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(positionData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to save position')
        }

        const result = await response.json()
        
        if (editingPosition.value) {
          // Update existing position in branch positions array
          const index = branchPositions.value.findIndex(p => p.id === editingPosition.value.id)
          if (index !== -1) {
            branchPositions.value[index] = result.data
          }
        } else {
          // Add new position to branch positions array
          branchPositions.value.unshift(result.data)
        }
        
        closePositionModal()
        console.log('Position saved successfully')
      } catch (error) {
        console.error('Error saving position:', error)
        alert(`Failed to save position: ${error.message}`)
      } finally {
        isSavingPosition.value = false
      }
    }

    const closePositionModal = () => {
      showAddPositionModal.value = false
      editingPosition.value = null
      resetPositionForm()
    }

    const resetPositionForm = () => {
      positionForm.value = {
        branch_id: '',
        position_title: '',
        position_code: '',
        department: '',
        position_type: 'Full-time',
        rate_per_hour: 0,
        status: 'open',
        description: '',
        requirements: '',
        assignment_type: 'new',
        linked_position_id: ''
      }
    }

    const viewPositionDetails = (position) => {
      // TODO: Implement position details view
      console.log('Viewing position details:', position)
      alert(`Position Details:\n\nTitle: ${position.position_title}\nDepartment: ${position.department}\nStatus: ${position.status}\nRate: ₱${position.rate_per_hour}/hour\nMonthly Salary: ₱${position.monthly_salary}`)
    }

    // Load applications from API
    const loadInterviews = async () => {
      try {
        isLoadingInterviews.value = true
        
        const response = await fetch('/api/job-applications/interviews', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load interviews')
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          interviews.value = result.data
          console.log(`Loaded ${interviews.value.length} interviews`)
        } else {
          console.warn('Interviews API returned no data')
          interviews.value = []
        }
      } catch (error) {
        console.error('Error loading interviews:', error)
        interviews.value = []
      } finally {
        isLoadingInterviews.value = false
      }
    }

    const loadApplications = async () => {
      try {
        isLoadingApplications.value = true
        
        const response = await fetch('/api/job-applications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load applications')
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          applications.value = result.data.map(app => ({
            ...app,
            applicant_name: app.full_name,
            applied_date: app.application_date,
            skills_count: app.skills ? app.skills.split(',').length : 0
          }))
          console.log(`Loaded ${applications.value.length} applications`)
        } else {
          console.warn('Applications API returned no data')
          applications.value = []
        }
      } catch (error) {
        console.error('Error loading applications:', error)
        applications.value = []
      } finally {
        isLoadingApplications.value = false
      }
    }

    // Load positions from API
    const loadPositions = async () => {
      try {
        isLoadingPositions.value = true
        
        // Fetch from branch-positions API (get all positions, not just open ones, so HR can manage them)
        const response = await fetch('/api/branch-positions', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load branch positions')
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          // Store branch positions separately (they already include branch_name, branch_code, branch_address from API)
          // Don't filter here - let the computed property handle filtering so we can toggle between open/closed
          // Only filter out deleted positions, keep both active and inactive for HR management
          branchPositions.value = result.data.filter(p => !p.deleted_at && p.branch_id != null)
          
          // Log detailed information for debugging
          console.log(`Loaded ${branchPositions.value.length} branch positions from API`)
          console.log(`Total positions returned by API: ${result.data.length}`)
          
          // Group by branch to see distribution
          const branchGroups = {}
          branchPositions.value.forEach(p => {
            const branchName = p.branch_name || 'Unknown Branch'
            if (!branchGroups[branchName]) {
              branchGroups[branchName] = []
            }
            branchGroups[branchName].push(p.position_title)
          })
          console.log('Branch positions grouped by branch:', branchGroups)
          console.log('Sample branch positions:', branchPositions.value.slice(0, 5).map(p => ({
            id: p.id,
            position_title: p.position_title,
            branch_name: p.branch_name,
            branch_id: p.branch_id,
            is_active: p.is_active,
            status: p.status
          })))
        } else {
          console.warn('Branch positions API returned no data or unsuccessful response:', result)
          branchPositions.value = []
        }
        
        // Load department positions from store (this will sync with Positions.vue)
        try {
          await positionsStore.fetchPositions()
          console.log('Loaded positions from store (synced with Position Management)')
          
          // Also store roles/positions data for watch functionality
          rolesPositionsData.value = positionsStore.positions
        } catch (err) {
          console.warn('Error loading positions from store:', err)
        }
        
        // Log total position counts by department and by branch
        const allPositions = positions.value // Use computed property
        const deptCounts = {}
        const branchCounts = {}
        allPositions.forEach(p => {
          if (p && p.department) {
            deptCounts[p.department] = (deptCounts[p.department] || 0) + 1
          }
          // Count branch positions separately
          if (p && p.branch_id && p.branch_name) {
            branchCounts[p.branch_name] = (branchCounts[p.branch_name] || 0) + 1
          }
        })
        console.log('Position counts by department:', deptCounts)
        console.log('Position counts by branch:', branchCounts)
        
        // Also check if there are branches without positions
        if (branches.value.length > 0) {
          const branchesWithPositions = new Set(Object.keys(branchCounts))
          const branchesWithoutPositions = branches.value
            .filter(b => b.is_active !== false)
            .filter(b => !branchesWithPositions.has(b.name))
            .map(b => b.name)
          if (branchesWithoutPositions.length > 0) {
            console.warn('Branches without any positions:', branchesWithoutPositions)
          }
        }
      } catch (error) {
        console.error('Error loading positions:', error)
        alert('Failed to load positions. Please try again.')
      } finally {
        isLoadingPositions.value = false
      }
    }

    // Load branches from API
    const loadBranches = async () => {
      try {
        isLoadingBranches.value = true
        
        const response = await fetch('/api/branches', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load branches')
        }

        const result = await response.json()
        branches.value = result.data || []
        
        console.log(`Loaded ${branches.value.length} branches`)
        console.log('Branches data:', branches.value) // Debug log
      } catch (error) {
        console.error('Error loading branches:', error)
        alert('Failed to load branches. Please try again.')
      } finally {
        isLoadingBranches.value = false
      }
    }

    // Set active department
    const setActiveDepartment = (department) => {
      activeDepartment.value = department
      currentPage.value = 1
      gridCurrentPage.value = 1
      cardCurrentPage.value = 1
    }

    // Watch for position title changes to auto-fill rate from Position Management
    watch(() => positionForm.value.position_title, (newPositionTitle) => {
      if (newPositionTitle && positionForm.value.department && positionForm.value.department !== 'Branch') {
        const departmentPositions = rolesPositionsData.value[positionForm.value.department]
        if (departmentPositions && departmentPositions.length > 0) {
          const matchingPosition = departmentPositions.find(p => 
            p.role.toLowerCase() === newPositionTitle.toLowerCase()
          )
          if (matchingPosition && matchingPosition.rate_per_hour) {
            positionForm.value.rate_per_hour = matchingPosition.rate_per_hour
            console.log(`Auto-filled rate for ${newPositionTitle} in ${positionForm.value.department}: ₱${matchingPosition.rate_per_hour}`)
          }
        }
      }
    })
    
    // Watch for tab changes to refresh positions from store (to sync with Position Management)
    watch(() => activeTab.value, (newTab) => {
      if (newTab === 'position-tracker') {
        // Refresh positions from store to ensure we have the latest rates
        positionsStore.fetchPositions().catch(err => {
          console.warn('Error refreshing positions from store:', err)
        })
        // Also refresh branch positions from API to get latest rates (synced from Position Management)
        loadPositions().catch(err => {
          console.warn('Error refreshing branch positions:', err)
        })
        // Also refresh rolesPositionsData for watch functionality
        rolesPositionsData.value = positionsStore.positions
      }
    })
    
    // Watch positionsStore.positions to automatically update department positions when rates change
    watch(() => positionsStore.positions, (newPositions) => {
      // Update rolesPositionsData when store positions change
      rolesPositionsData.value = newPositions
      console.log('Position store updated - rates may have changed, refreshing display')
    }, { deep: true })

    // Lifecycle
    onMounted(() => {
      loadApplications()
      loadInterviews()
      loadPositions()
      loadBranches()
    })

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
      loadInterviews,
      conductInterview,
      viewInterviewDetails,
      rescheduleInterview,
      cancelInterview,
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
      getFilteredApplicationsCount,
      formatDate,
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
      confirmInterviewDelete,
      showInterviewDeleteModal,
      interviewToDelete,
      showInterviewDetailsModal,
      selectedInterview,
      showNotificationModal,
      notificationData,
      showNotification,
      handleTabClick,
      clearFilters,
      // Position management
      showAddPositionModal,
      editingPosition,
      isLoadingPositions,
      isSavingPosition,
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
      addPosition,
      editPosition,
      deletePosition,
      togglePositionStatus,
      savePosition,
      closePositionModal,
      resetPositionForm,
      viewPositionDetails,
      loadPositions,
      loadBranches,
      loadApplications
    }
  }
}
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
  display: flex;
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

/* Buttons */
.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primaryColor);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primaryColor);
}

.btn-secondary {
  background: #e2e8f0;
  color: #475569;
}

.btn-secondary:hover {
  background: #cbd5e1;
}

.btn-outline {
  background: transparent;
  color: #64748b;
  border: 1px solid #d1d5db;
}

.btn-outline:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

/* Responsive */
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
    flex-direction: column;
    text-align: center;
  }
  
  .calendar-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .calendar-controls {
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
