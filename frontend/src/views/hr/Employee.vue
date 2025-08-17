<script setup>
  import { ref } from 'vue';
  import { Users, Plus, Search } from 'lucide-vue-next';

  const searchQuery = ref('');
  const employees = ref([
    {
      id: 1,
      name: 'John Doe',
      department: 'Human Resource',
      role: 'Manager',
      status: 'Active',
    },
    {
      id: 2,
      name: 'Jane Smith',
      department: 'Finance',
      role: 'Staff',
      status: 'Active',
    },
    {
      id: 3,
      name: 'Bob Johnson',
      department: 'Production',
      role: 'Supervisor',
      status: 'On Leave',
    },
  ]);
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">Employee Management</h1>
      <button class="btn bg-primaryColor text-white hover:bg-primaryColor/80 border-none">
        <Plus class="w-4 h-4 mr-2" />
        Add Employee
      </button>
    </div>

    <!-- Search and Filters -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex gap-4">
          <div class="form-control flex-1">
            <div class="input-group">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search employees..."
                class="input input-bordered flex-1"
              />
              <button class="btn btn-square">
                <Search class="w-4 h-4" />
              </button>
            </div>
          </div>
          <select class="select select-bordered">
            <option>All Departments</option>
            <option>Human Resource</option>
            <option>Finance</option>
            <option>Production</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Employee Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="employee in employees" :key="employee.id">
                <td>
                  <div class="flex items-center space-x-3">
                    <div class="avatar placeholder">
                      <div
                        class="bg-neutral-focus text-neutral-content rounded-full w-12"
                      >
                        <span>{{ employee.name.charAt(0) }}</span>
                      </div>
                    </div>
                    <div class="font-bold">{{ employee.name }}</div>
                  </div>
                </td>
                <td>{{ employee.department }}</td>
                <td>{{ employee.role }}</td>
                <td>
                  <div
                    class="badge"
                    :class="
                      employee.status === 'Active'
                        ? 'badge-success'
                        : 'badge-warning'
                    "
                  >
                    {{ employee.status }}
                  </div>
                </td>
                <td>
                  <div class="dropdown dropdown-left">
                    <label tabindex="0" class="btn btn-ghost btn-xs">⋮</label>
                    <ul
                      tabindex="0"
                      class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      <li><a>Edit</a></li>
                      <li><a>View Details</a></li>
                      <li><a class="text-error">Delete</a></li>
                    </ul>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
