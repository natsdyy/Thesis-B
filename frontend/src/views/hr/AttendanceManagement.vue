<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">Attendance Management</h1>
      <div class="text-sm text-base-content/70">
        Last updated: {{ new Date().toLocaleDateString() }}
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="stat bg-base-100 shadow-lg rounded-lg">
        <div class="stat-figure text-secondary">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
        </div>
        <div class="stat-title">Total Employees</div>
        <div class="stat-value text-secondary">{{ totalEmployees }}</div>
        <div class="stat-desc">Active staff members</div>
      </div>

      <div class="stat bg-base-100 shadow-lg rounded-lg">
        <div class="stat-figure text-success">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-title">Present Today</div>
        <div class="stat-value text-success">{{ presentToday }}</div>
        <div class="stat-desc">{{ attendancePercentage }}% attendance rate</div>
      </div>

      <div class="stat bg-base-100 shadow-lg rounded-lg">
        <div class="stat-figure text-warning">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-title">Late Arrivals</div>
        <div class="stat-value text-warning">{{ lateArrivals }}</div>
        <div class="stat-desc">This week</div>
      </div>

      <div class="stat bg-base-100 shadow-lg rounded-lg">
        <div class="stat-figure text-error">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <div class="stat-title">Absent Today</div>
        <div class="stat-value text-error">{{ absentToday }}</div>
        <div class="stat-desc">No check-in recorded</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 relative z-10">
        <button
          type="button"
          v-for="tab in tabs"
          :key="tab.key"
        :class="['px-4 py-2 rounded-t-lg transition-colors focus:outline-none', currentTab === tab.key ? 'bg-base-100 text-base-content shadow-md' : 'bg-base-300 text-base-content/70']"
          @click="currentTab = tab.key"
        >
          {{ tab.label }}
        </button>
    </div>

    <!-- Tab Content -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Attendance Records Tab -->
        <div v-if="currentTab === 'attendance'" class="space-y-4">
          <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold">Attendance Records</h2>
            <div class="flex gap-2">
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Search employees..." 
                class="input input-bordered input-sm w-64"
              />
              <select v-model="selectedDate" class="select select-bordered select-sm">
                <option value="">All Dates</option>
                <option v-for="date in availableDates" :key="date" :value="date">
                  {{ formatDate(date) }}
          </option>
        </select>
              <button @click="refreshAttendance" class="btn btn-success btn-sm">
                <svg class="w-4 h-4" fill="none" stroke="background-color" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
              </button>
            </div>
      </div>

          <!-- Attendance Table -->
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Hours Worked</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in filteredAttendance" :key="record.id">
                  <td>
                    <div class="flex items-center space-x-3">
                      <div class="avatar">
                        <div class="mask mask-squircle w-12 h-12">
                          <div class="bg-primary text-primary-content flex items-center justify-center">
                            {{ getInitials(record.first_name, record.last_name) }}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div class="font-bold">{{ record.first_name }} {{ record.last_name }}</div>
                        <div class="text-sm opacity-50">ID: {{ record.employee_id }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ formatDate(record.created_at) }}</td>
                  <td>
                    <span v-if="record.time_in" class="badge badge-success">
                      {{ formatTime(record.time_in) }}
                    </span>
                    <span v-else class="badge badge-ghost">Not checked in</span>
                  </td>
                  <td>
                    <span v-if="record.time_out" class="badge badge-info">
                      {{ formatTime(record.time_out) }}
                    </span>
                    <span v-else class="badge badge-ghost">Not checked out</span>
                  </td>
                  <td>
                    <span v-if="record.hours_worked" class="font-mono">
                      {{ record.hours_worked }}h
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td>
                    <div class="badge" :class="getStatusBadgeClass(record.status)">
                      {{ record.status }}
                    </div>
                  </td>
                  <td>
                    <span class="text-sm">{{ record.location_name || 'N/A' }}</span>
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button @click="viewDetails(record)" class="btn btn-ghost btn-xs">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                      </button>
                      <button @click="editRecord(record)" class="btn btn-ghost btn-xs">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredAttendance.length === 0">
                  <td colspan="8" class="text-center py-8 text-gray-500">
                    <div class="flex flex-col items-center space-y-2">
                      <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <p>No attendance records found</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          </div>

        <!-- Schedule Management Tab -->
        <div v-if="currentTab === 'schedule'" class="space-y-4">
          <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold">Branch Schedules</h2>
            <button @click="showAddScheduleModal = true" class="btn btn-success">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add Schedule
            </button>
          </div>

          <!-- Schedules by Branch -->
          <div v-if="Object.keys(schedulesByBranch).length > 0" class="space-y-6">
            <div v-for="(schedules, branchName) in schedulesByBranch" :key="branchName" class="card bg-base-100 shadow-lg">
              <div class="card-body">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-xl font-bold text-success">{{ branchName }}</h3>
                  <div class="flex items-center gap-2">
                    <div class="badge badge-success badge-lg">{{ schedules.length }} schedule{{ schedules.length !== 1 ? 's' : '' }}</div>
                    <div v-if="branchSummaryMap[branchName]" class="flex gap-2">
                      <div class="badge badge-success badge-outline">specific: {{ branchSummaryMap[branchName].byType.specific || 0 }}</div>
                      <div class="badge badge-success badge-outline">weekdays: {{ branchSummaryMap[branchName].byType.weekdays || 0 }}</div>
                      <div class="badge badge-success badge-outline">weekends: {{ branchSummaryMap[branchName].byType.weekends || 0 }}</div>
                      <div class="badge badge-success badge-outline">custom: {{ branchSummaryMap[branchName].byType.custom || 0 }}</div>
                    </div>
          </div>
        </div>

                <div class="overflow-x-auto">
                  <table class="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Schedule Type</th>
                        <th>Days/Date</th>
                        <th>Shift Start</th>
                        <th>Shift End</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="schedule in schedules" :key="schedule.id">
                        <td>
                          <div class="badge badge-success badge-outline">
                            {{ schedule.schedule_type || 'specific' }}
                          </div>
                        </td>
                        <td>
                          <div v-if="schedule.schedule_type === 'specific'">
                            {{ formatDate(schedule.schedule_date) }}
                          </div>
                          <div v-else-if="schedule.selected_days && schedule.selected_days.length > 0">
                            <div class="flex flex-wrap gap-1">
                              <span v-for="day in schedule.selected_days" :key="day" class="badge badge-sm badge-success">
                                {{ day.charAt(0).toUpperCase() + day.slice(1) }}
                              </span>
                </div>
              </div>
                          <div v-else class="text-gray-400">-</div>
                        </td>
                        <td><span class="font-mono">{{ formatTime(schedule.shift_start) }}</span></td>
                        <td><span class="font-mono">{{ formatTime(schedule.shift_end) }}</span></td>
                        <td>
                          <div class="badge" :class="getScheduleStatusBadgeClass(schedule.status)">{{ schedule.status }}</div>
                        </td>
                        <td>
                          <div class="flex gap-1">
                            <button @click="editSchedule(schedule)" class="btn btn-ghost btn-xs">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button @click="deleteSchedule(schedule.id)" class="btn btn-ghost btn-xs text-error">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-12 text-gray-500">
            <div class="flex flex-col items-center space-y-4">
              <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <h3 class="text-lg font-semibold">No schedules found</h3>
              <p class="text-sm">Create your first schedule to get started</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Schedule Modal -->
    <div v-if="showAddScheduleModal" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Add New Schedule</h3>
        <form @submit.prevent="addSchedule" class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Branch</span></label>
            <select v-model="newSchedule.branch_id" class="select select-bordered w-full" required>
              <option value="">Select Branch</option>
              <option v-for="branch in branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text">Schedule Type</span></label>
            <select v-model="newSchedule.schedule_type" class="select select-bordered w-full" required>
              <option value="specific">Specific Date</option>
              <option value="weekdays">Weekdays (Mon-Fri)</option>
              <option value="weekends">Weekends (Sat-Sun)</option>
              <option value="custom">Custom Days</option>
            </select>
          </div>

          <div v-if="newSchedule.schedule_type === 'specific'" class="form-control">
            <label class="label"><span class="label-text">Schedule Date</span></label>
            <input v-model="newSchedule.schedule_date" type="date" class="input input-bordered w-full" required />
          </div>

          <div v-else class="form-control">
            <label class="label flex justify-between items-center mb-3">
              <span class="label-text">Select Days</span>
              <label class="flex items-center gap-2 cursor-pointer">
                <span class="text-sm">Select all</span>
                <input type="checkbox" class="checkbox checkbox-success" :checked="isAllDaysSelected" @change="toggleSelectAllDays" />
              </label>
            </label>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4">
              <label v-for="day in availableDayOptions" :key="day.value" class="cursor-pointer label justify-between px-4 py-3 rounded bg-success/20 border border-success/40 hover:bg-success/30">
                <span class="label-text text-success font-medium">{{ day.label }}</span>
                <input type="checkbox" :value="day.value" v-model="newSchedule.selected_days" class="checkbox checkbox-success" />
              </label>
            </div>
            <div v-if="newSchedule.selected_days.length === 0" class="text-sm text-error mt-2">Please select at least one day</div>
          </div>

          <!-- Time pickers as dropdowns -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div class="form-control">
              <label class="label mb-2"><span class="label-text">Shift Start</span></label>
              <div class="flex gap-3">
                <input v-model="startHour" @input="onHourInput('start')" inputmode="numeric" pattern="[0-9]*" maxlength="2" placeholder="HH" class="input input-bordered w-1/3 focus:border-success focus:ring-success focus:ring-2" />
                <input v-model="startMinute" @input="onMinuteInput('start')" inputmode="numeric" pattern="[0-9]*" maxlength="2" placeholder="MM" class="input input-bordered w-1/3 focus:border-success focus:ring-success focus:ring-2" />
                <select v-model="startAmPm" class="select select-bordered w-1/3 focus:border-success focus:ring-success focus:ring-2">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div class="form-control">w
              <label class="label mb-2"><span class="label-text">Shift End</span></label>
              <div class="flex gap-3">
                <input v-model="endHour" @input="onHourInput('end')" inputmode="numeric" pattern="[0-9]*" maxlength="2" placeholder="HH" class="input input-bordered w-1/3 focus:border-success focus:ring-success focus:ring-2" />
                <input v-model="endMinute" @input="onMinuteInput('end')" inputmode="numeric" pattern="[0-9]*" maxlength="2" placeholder="MM" class="input input-bordered w-1/3 focus:border-success focus:ring-success focus:ring-2" />
                <select v-model="endAmPm" class="select select-bordered w-1/3 focus:border-success focus:ring-success focus:ring-2">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
            </div>
            </div>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeModal" class="btn btn-ghost">Cancel</button>
            <button type="submit" class="btn btn-success" :disabled="isLoading || !isFormValid">
              <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
              Add Schedule
            </button>
          </div>
        </form>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue"
import axios from "axios"
import { apiConfig } from "../../config/api.js"

// API Configuration
const API_BASE_URL = apiConfig.baseURL
const authHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Reactive data
const tabs = [
  { key: "attendance", label: "Attendance Records" },
  { key: "schedule", label: "Branch Schedules" }
]

const currentTab = ref("attendance")
const isLoading = ref(false)
const searchQuery = ref("")
const selectedDate = ref("")

// Attendance data
const attendanceRecords = ref([])
const branchSchedules = ref([])
const branches = ref([])
const branchSummaries = ref([])

// Stats
const totalEmployees = ref(0)
const presentToday = ref(0)
const lateArrivals = ref(0)
const absentToday = ref(0)

// Modal state
const showAddScheduleModal = ref(false)
const newSchedule = ref({
  branch_id: "",
  schedule_type: "specific",
  schedule_date: "",
  selected_days: [],
  shift_start: "",
  shift_end: ""
})

// Day options
const dayOptions = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" }
]

const weekdayOptions = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" }
]

const weekendOptions = [
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" }
]

// Computed
const filteredAttendance = computed(() => {
  let filtered = attendanceRecords.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(record => 
      record.first_name?.toLowerCase().includes(query) ||
      record.last_name?.toLowerCase().includes(query) ||
      record.employee_id?.toLowerCase().includes(query)
    )
  }

  if (selectedDate.value) {
    filtered = filtered.filter(record => 
      record.created_at?.startsWith(selectedDate.value)
    )
  }

  return filtered
})

const availableDates = computed(() => {
  const dates = [...new Set(attendanceRecords.value.map(r => r.created_at?.split('T')[0]))].filter(Boolean).sort().reverse()
  return dates
})

const attendancePercentage = computed(() => totalEmployees.value === 0 ? 0 : Math.round((presentToday.value / totalEmployees.value) * 100))

const schedulesByBranch = computed(() => {
  const grouped = {}
  branchSchedules.value.forEach(s => {
    const b = s.branch_name || 'Unknown Branch'
    if (!grouped[b]) grouped[b] = []
    grouped[b].push(s)
  })
  return grouped
})

const availableDayOptions = computed(() => {
  switch (newSchedule.value.schedule_type) {
    case 'weekdays': return weekdayOptions
    case 'weekends': return weekendOptions
    default: return dayOptions
  }
})

const isAllDaysSelected = computed(() => {
  const all = availableDayOptions.value.map(d => d.value)
  if (all.length === 0) return false
  return all.every(v => newSchedule.value.selected_days.includes(v))
})

function toggleSelectAllDays(){
  const all = availableDayOptions.value.map(d => d.value)
  if (isAllDaysSelected.value) {
    // clear all that belong to current visible options
    newSchedule.value.selected_days = newSchedule.value.selected_days.filter(v => !all.includes(v))
  } else {
    // add missing ones
    const set = new Set(newSchedule.value.selected_days)
    all.forEach(v => set.add(v))
    newSchedule.value.selected_days = Array.from(set)
  }
}

// Time dropdown sources
const hours12 = ["01","02","03","04","05","06","07","08","09","10","11","12"]
const minutes = ["00","05","10","15","20","25","30","35","40","45","50","55"]

function digits2(v){ return (v || '').replace(/\D/g,'').slice(0,2) }

function onHourInput(which){
  if (which === 'start') startHour.value = digits2(startHour.value)
  else endHour.value = digits2(endHour.value)
}

function onMinuteInput(which){
  if (which === 'start') startMinute.value = digits2(startMinute.value)
  else endMinute.value = digits2(endMinute.value)
}

// Local input/dropdown models
const startHour = ref("09")
const startMinute = ref("00")
const startAmPm = ref("AM")
const endHour = ref("05")
const endMinute = ref("00")
const endAmPm = ref("PM")

function pad2(v){ return String(v).padStart(2,'0') }
function clamp(num, min, max){ return Math.min(Math.max(num, min), max) }
function isValidH12(v){ const n = Number(v); return Number.isInteger(n) && n>=1 && n<=12 }
function isValidMinute(v){ const n = Number(v); return Number.isInteger(n) && n>=0 && n<=59 }

// Convert to 24h HH:mm:ss
function to24h(h12, m, ampm){
  let h = clamp(parseInt(h12 || '0', 10), 1, 12)
  let minutes = clamp(parseInt(m || '0', 10), 0, 59)
  if (ampm === 'AM') { h = h === 12 ? 0 : h } else { h = h === 12 ? 12 : h + 12 }
  return `${pad2(h)}:${pad2(minutes)}:00`
}

const isFormValid = computed(() => {
  if (!newSchedule.value.branch_id) return false
  if (!isValidH12(startHour.value) || !isValidMinute(startMinute.value)) return false
  if (!isValidH12(endHour.value) || !isValidMinute(endMinute.value)) return false
  if (newSchedule.value.schedule_type === 'specific') return !!newSchedule.value.schedule_date
  return newSchedule.value.selected_days.length > 0
})

// Helpers
const formatDate = (d) => !d ? 'N/A' : new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
const formatTime = (t) => !t ? 'N/A' : new Date(`1970-01-01T${t}Z`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
const getScheduleStatusBadgeClass = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'active': return 'badge-success'
    case 'completed': return 'badge-info'
    case 'cancelled': return 'badge-error'
    default: return 'badge-ghost'
  }
}

// Attendance status badge helper (used in Attendance Records table)
const getStatusBadgeClass = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'present': return 'badge-success'
    case 'late': return 'badge-warning'
    case 'absent': return 'badge-error'
    default: return 'badge-ghost'
  }
}

// Initials helper (used for avatar letters)
function getInitials(firstName, lastName){
  const first = (firstName || '').trim()
  const last = (lastName || '').trim()
  const a = first ? first[0] : ''
  const b = last ? last[0] : ''
  return `${a}${b}`.toUpperCase() || '—'
}

// Build a quick map to show summary badges beside branch name
const branchSummaryMap = computed(() => {
  const map = {}
  branchSummaries.value.forEach(s => { map[s.branch_name] = s })
  return map
})

// API
const fetchAttendanceRecords = async () => {
  try {
    isLoading.value = true
    const response = await axios.get(`${API_BASE_URL}/attendance/report`, {
      headers: authHeaders(),
      params: {
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      }
    })
    
    if (response.data.success) {
      attendanceRecords.value = response.data.data || []
      calculateStats()
    } else {
      console.error('API returned error:', response.data.message)
      attendanceRecords.value = []
    }
  } catch (error) {
    console.error('Error fetching attendance records:', error)
    attendanceRecords.value = []
    // Show user-friendly error message
    if (error.response?.status === 401) {
      console.error('Authentication required - please login again')
    } else if (error.response?.status === 500) {
      console.error('Server error - please try again later')
    }
  } finally {
    isLoading.value = false
  }
}

const fetchBranchSchedules = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/branch-schedules`, { headers: authHeaders() })
  if (data?.success) branchSchedules.value = data.data
}

const fetchBranchSummaries = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/branch-schedules/summary`, { headers: authHeaders() })
  if (data?.success) branchSummaries.value = data.data
}

const fetchBranches = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/branches`, { headers: authHeaders() })
    // Backend returns a plain array (no success wrapper) for this endpoint
    if (Array.isArray(res.data)) {
      branches.value = res.data
    } else if (res.data?.success && Array.isArray(res.data.data)) {
      branches.value = res.data.data
    } else {
      branches.value = []
    }
  } catch (_e) {
    // Fallback so UI stays usable if request fails
    branches.value = []
  }
}

const fetchTotalEmployees = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/employees`, { headers: authHeaders() })
    if (Array.isArray(res.data)) {
      totalEmployees.value = res.data.length
    } else if (res.data?.success && Array.isArray(res.data.data)) {
      totalEmployees.value = res.data.data.length
    }
  } catch (error) {
    console.error('Error fetching total employees:', error)
    totalEmployees.value = 0
  }
}

const calculateStats = () => {
  const today = new Date().toISOString().split('T')[0]
  const todayRecords = attendanceRecords.value.filter(record => 
    record.created_at?.startsWith(today)
  )
  
  presentToday.value = todayRecords.filter(record => record.status === 'present').length
  lateArrivals.value = todayRecords.filter(record => record.status === 'late').length
  absentToday.value = totalEmployees.value - presentToday.value
}

const refreshAttendance = () => {
  fetchAttendanceRecords()
}

const fetchAttendanceByDateRange = async (startDate, endDate) => {
  try {
    isLoading.value = true
    const response = await axios.get(`${API_BASE_URL}/attendance/report`, {
      headers: authHeaders(),
      params: {
        start_date: startDate,
        end_date: endDate
      }
    })
    
    if (response.data.success) {
      attendanceRecords.value = response.data.data || []
      calculateStats()
    } else {
      console.error('API returned error:', response.data.message)
      attendanceRecords.value = []
    }
  } catch (error) {
    console.error('Error fetching attendance records:', error)
    attendanceRecords.value = []
  } finally {
    isLoading.value = false
  }
}

const closeModal = () => { showAddScheduleModal.value = false; resetForm() }
const resetForm = () => {
  newSchedule.value = { branch_id: '', schedule_type: 'specific', schedule_date: '', selected_days: [], shift_start: '', shift_end: '' }
  startHour.value = '09'; startMinute.value = '00'; startAmPm.value = 'AM'
  endHour.value = '05'; endMinute.value = '00'; endAmPm.value = 'PM'
}

const addSchedule = async () => {
  isLoading.value = true
  try {
    const payload = {
      branch_id: parseInt(newSchedule.value.branch_id),
      schedule_type: newSchedule.value.schedule_type,
      shift_start: to24h(startHour.value, startMinute.value, startAmPm.value),
      shift_end: to24h(endHour.value, endMinute.value, endAmPm.value),
      status: 'active'
    }
    if (newSchedule.value.schedule_type === 'specific') payload.schedule_date = newSchedule.value.schedule_date
    else payload.selected_days = newSchedule.value.selected_days

    console.debug('[addSchedule] POST payload:', payload)
    const res = await axios.post(`${API_BASE_URL}/branch-schedules`, payload, { headers: authHeaders() })
    if (res.data?.success) {
      await Promise.all([fetchBranchSchedules(), fetchBranchSummaries()])
      closeModal()
    } else {
      const msg = res.data?.message || 'Failed to create schedule'
      console.error('[addSchedule] API responded with error:', res.data, 'message:', msg)
    }
  } catch (error) {
    const status = error?.response?.status
    const data = error?.response?.data
    const serverMsg = (data && (data.message || data.error || data.msg)) || error?.message || 'Request failed'
    console.error('[addSchedule] Request error:', { status, data, serverMsg, error })
  } finally {
    isLoading.value = false
  }
}

const editSchedule = (schedule) => {
  console.log('Edit schedule:', schedule)
  // Implement edit functionality
}

const deleteSchedule = async (id) => {
  if (!confirm('Are you sure you want to delete this schedule?')) return
  await axios.delete(`${API_BASE_URL}/branch-schedules/${id}`, { headers: authHeaders() })
  await Promise.all([fetchBranchSchedules(), fetchBranchSummaries()])
}

const viewDetails = (record) => {
  console.log('View details:', record)
  // Implement view details functionality
}

const editRecord = (record) => {
  console.log('Edit record:', record)
  // Implement edit record functionality
}

// Watchers
watch(selectedDate, (newDate) => {
  if (newDate) {
    fetchAttendanceByDateRange(newDate, newDate)
  } else {
    fetchAttendanceRecords()
  }
})

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchAttendanceRecords(),
    fetchBranchSchedules(),
    fetchBranchSummaries(),
    fetchBranches(),
    fetchTotalEmployees()
  ])
})
</script>

