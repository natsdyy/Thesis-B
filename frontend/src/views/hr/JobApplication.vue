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
                    <span class="text-gray-600">Showing {{ applications.length }} applications</span>
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
                    <button @click="viewApplication(application)" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View
                    </button>
                    <button @click="reviewApplication(application)" class="text-green-600 hover:text-green-700 text-sm font-medium">
                      Review
                    </button>
                    <button @click="shortlistApplication(application)" class="text-purple-600 hover:text-purple-700 text-sm font-medium">
                      Shortlist
                    </button>
                  </div>
                  <button @click="rejectApplication(application)" class="text-red-600 hover:text-red-700 text-sm font-medium">
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div class="flex justify-between items-center mt-8">
              <div class="text-sm text-gray-600">
                Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, applications.length) }} of {{ applications.length }} applications
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
          
          <h3> <font-awesome-icon icon="fa-solid fa-calendar" /> Interview Schedule</h3>
          <p>Calendar view, interviewer assignment, time slots</p>
        </div>
        <div class="content-section">
          <div class="calendar-container">
            <div class="calendar-header">
              <h4>Upcoming Interviews</h4>
              <div class="calendar-controls">
                <button class="btn btn-outline">Today</button>
                <button class="btn btn-outline">This Week</button>
                <button class="btn btn-outline">This Month</button>
              </div>
            </div>
            <div class="interview-list">
              <div class="interview-item">
                <div class="interview-time">10:00 AM</div>
                <div class="interview-details">
                  <div class="candidate-name">John Doe</div>
                  <div class="position">Software Developer</div>
                  <div class="interviewer">Sarah Johnson</div>
                </div>
                <div class="interview-type">In-Person</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Application Status Tab -->
      <div v-if="activeTab === 'application-status'" class="tab-panel">
        <div class="panel-header">
          <h3>✅ Application Status</h3>
          <p>Track progress (Shortlisted, On-Hold, Rejected, Hired)</p>
        </div>
        <div class="content-section">
          <div class="status-grid">
            <div class="status-card shortlisted">
              <div class="status-icon">📋</div>
              <div class="status-count">{{ shortlistedCount }}</div>
              <div class="status-label">Shortlisted</div>
            </div>
            <div class="status-card on-hold">
              <div class="status-icon">⏸️</div>
              <div class="status-count">{{ onHoldCount }}</div>
              <div class="status-label">On-Hold</div>
            </div>
            <div class="status-card rejected">
              <div class="status-icon">❌</div>
              <div class="status-count">{{ rejectedCount }}</div>
              <div class="status-label">Rejected</div>
            </div>
            <div class="status-card hired">
              <div class="status-icon">✅</div>
              <div class="status-count">{{ hiredCount }}</div>
              <div class="status-label">Hired</div>
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
            <!-- Header with Refresh Button -->
            <div class="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-4">
              <div class="flex justify-between items-center">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Open Job Positions</h3>
                  <p class="text-sm text-gray-600 mt-1">List of available positions displayed on the landing page</p>
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

            <!-- Cards Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-4">
              <div
                v-for="position in filteredPositions"
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
                      <p class="text-xs sm:text-sm text-black/60 truncate">
                        {{ position.department }}
                      </p>
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

            <!-- Footer Stats -->
            <div class="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div class="flex justify-between items-center">
                <div class="text-sm text-gray-700">
                  Showing <span class="font-medium">{{ positions.length }}</span> positions
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
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  FileUser, Plus, Download, Calendar, Users, Target, CheckCircle,
  Inbox, Clock, UserCheck, MapPin, Eye, Search, X, AlertTriangle, RefreshCw, Filter,
  SquarePen, CircleX, Building2
} from 'lucide-vue-next'

export default {
  name: 'JobApplication',
  components: {
    FileUser, Plus, Download, Calendar, Users, Target, CheckCircle,
    Inbox, Clock, UserCheck, MapPin, Eye, Search, X, AlertTriangle, RefreshCw, Filter,
    SquarePen, CircleX, Building2
  },
  setup() {
    const router = useRouter()
    
    // Active tab
    const activeTab = ref('new-applications')
    
    // Active department for filtering
    const activeDepartment = ref('All')

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
        id: 'application-status',
        name: 'Application Status',
        icon: CheckCircle
      },
      {
        id: 'position-tracker',
        name: 'Position Tracker',
        icon: Target
      },
    ])

    // Statistics data - will be populated from API
    const screenedCount = ref(0)
    const processedCount = ref(0)
    const shortlistedCount = ref(0)
    const onHoldCount = ref(0)
    const rejectedCount = ref(0)
    const hiredCount = ref(0)

    // Application data - will be populated from API
    const applications = ref([])
    const positions = ref([])
    const rolesPositionsData = ref({}) // Store roles/positions data by department
    const searchQuery = ref('')
    const statusFilter = ref('')
    const positionFilter = ref('')
    const dateFilter = ref('')
    const currentPage = ref(1)
    const itemsPerPage = ref(10)

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
      const deptSet = new Set(positions.value.map(p => p.department))
      return ['All', ...Array.from(deptSet).sort()]
    })

    // Filter positions by department
    const filteredPositions = computed(() => {
      if (activeDepartment.value === 'All') {
        return positions.value
      }
      return positions.value.filter(p => p.department === activeDepartment.value)
    })

    // Filter positions by department (helper function for tabs)
    const filteredPositionsByDepartment = (department) => {
      if (department === 'All') {
        return positions.value
      }
      return positions.value.filter(p => p.department === department)
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

    const totalPages = computed(() => 
      Math.ceil(applications.value.length / itemsPerPage.value)
    )

    const paginatedApplications = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return applications.value.slice(start, end)
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

    // Methods
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString()
    }

    const formatTime = (dateString) => {
      return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      // TODO: Implement view application modal/page
    }

    const reviewApplication = (application) => {
      application.status = 'reviewing'
      // TODO: Update application status via API
    }

    const shortlistApplication = (application) => {
      application.status = 'shortlisted'
      // TODO: Update application status via API
    }

    const rejectApplication = (application) => {
      application.status = 'rejected'
      // TODO: Update application status via API
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

          // Remove from local array
          positions.value = positions.value.filter(p => p.id !== positionId)
          
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

          // Update local array - map is_active to status
          const index = positions.value.findIndex(p => p.id === position.id)
          if (index !== -1) {
            // Update the position with new data
            positions.value[index] = {
              ...positions.value[index],
              ...responseData.data,
              status: responseData.data.is_active ? 'open' : 'closed'
            }
            console.log(`Department position status updated to ${responseData.data.is_active ? 'open' : 'closed'}`)
          }
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
          const index = positions.value.findIndex(p => p.id === position.id)
          if (index !== -1) {
            const updatedStatus = responseData.data?.status || newStatus
            console.log('Setting position status to:', updatedStatus)
            positions.value[index] = { 
              ...positions.value[index], 
              ...responseData.data,
              status: updatedStatus // Explicitly set status from response
            }
            console.log(`Branch position status updated to ${updatedStatus}`)
            console.log('Final position data:', positions.value[index])
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
          // Update existing position in local array
          const index = positions.value.findIndex(p => p.id === editingPosition.value.id)
          if (index !== -1) {
            positions.value[index] = result.data
          }
        } else {
          // Add new position to local array
          positions.value.unshift(result.data)
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

    // Load positions from API
    const loadPositions = async () => {
      try {
        isLoadingPositions.value = true
        
        // Fetch from branch-positions API (now includes department positions)
        const response = await fetch('/api/branch-positions', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load positions')
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          positions.value = result.data
          console.log(`Loaded ${positions.value.length} positions from API`)
          
          // Group by department to show counts
          const deptCounts = {}
          positions.value.forEach(p => {
            deptCounts[p.department] = (deptCounts[p.department] || 0) + 1
          })
          console.log('Position counts by department:', deptCounts)
        } else {
          console.warn('Positions API returned no data or unsuccessful response:', result)
          positions.value = []
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

    // Lifecycle
    onMounted(() => {
      // TODO: Load applications from API
      // loadApplications()
      loadPositions()
      loadBranches()
    })

    return {
      activeTab,
      activeDepartment,
      tabs,
      newApplicationsCount,
      pendingReviewCount,
      screenedCount,
      processedCount,
      shortlistedCount,
      onHoldCount,
      rejectedCount,
      hiredCount,
      applications,
      positions,
      rolesPositionsData,
      searchQuery,
      statusFilter,
      positionFilter,
      dateFilter,
      currentPage,
      itemsPerPage,
      selectAll,
      filteredApplications,
      totalPages,
      paginatedApplications,
      formatDate,
      formatTime,
      toggleSelectAll,
      markAllAsReviewed,
      viewApplication,
      reviewApplication,
      shortlistApplication,
      rejectApplication,
      handleTabClick,
      clearFilters,
      // Position management
      showAddPositionModal,
      editingPosition,
      isLoadingPositions,
      isSavingPosition,
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
      addPosition,
      editPosition,
      deletePosition,
      togglePositionStatus,
      savePosition,
      closePositionModal,
      resetPositionForm,
      viewPositionDetails,
      loadPositions,
      loadBranches
    }
  }
}
</script>

<style>
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
  background: #f8fafc;
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
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
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

</style>
