import { defineStore } from 'pinia';
import { apiConfig } from '../config/api.js';

export const useEmployeeStore = defineStore('employee', {
  state: () => ({
    employees: [],
    employeeStats: {
      total_employees: 0,
      active_employees: 0,
      departments: 0,
      new_this_month: 0,
    },
    loading: false,
    error: null,
    selectedEmployee: null,
    filters: {
      department: '',
      status: '',
      search: '',
    },
  }),

  getters: {
    // Get employees filtered by current filters
    filteredEmployees: (state) => {
      let filtered = [...state.employees];

      if (state.filters.department) {
        filtered = filtered.filter(
          (emp) => emp.department === state.filters.department
        );
      }

      if (state.filters.status) {
        filtered = filtered.filter(
          (emp) => emp.status === state.filters.status
        );
      }

      if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        filtered = filtered.filter(
          (emp) =>
            emp.first_name.toLowerCase().includes(search) ||
            emp.last_name.toLowerCase().includes(search) ||
            emp.employee_id.toLowerCase().includes(search) ||
            emp.email?.toLowerCase().includes(search) ||
            emp.department.toLowerCase().includes(search) ||
            emp.job_title.toLowerCase().includes(search)
        );
      }

      return filtered;
    },

    // Get employees by department
    employeesByDepartment: (state) => {
      const departments = {};
      state.employees.forEach((emp) => {
        if (!departments[emp.department]) {
          departments[emp.department] = [];
        }
        departments[emp.department].push(emp);
      });
      return departments;
    },

    // Get active employees count
    activeEmployeesCount: (state) => {
      return state.employees.filter((emp) => emp.status === 'Active').length;
    },

    // Get employees count by status
    employeesByStatus: (state) => {
      const statusCount = {};
      state.employees.forEach((emp) => {
        statusCount[emp.status] = (statusCount[emp.status] || 0) + 1;
      });
      return statusCount;
    },
  },

  actions: {
    // Set loading state
    setLoading(loading) {
      this.loading = loading;
    },

    // Set error state
    setError(error) {
      this.error = error;
    },

    // Clear error
    clearError() {
      this.error = null;
    },

    // Set filters
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters };
    },

    // Clear filters
    clearFilters() {
      this.filters = {
        department: '',
        status: '',
        search: '',
      };
    },

    // Fetch all employees
    async fetchEmployees(includeDeleted = false) {
      this.setLoading(true);
      this.clearError();

      try {
        const params = new URLSearchParams();
        if (includeDeleted) params.append('includeDeleted', 'true');

        const response = await fetch(
          `${apiConfig.baseURL}/employees?${params}`,
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
          // Safety: exclude System/Super Admin on client even if backend missed it
          this.employees = (data.data || []).filter((e) => {
            const r = (e.role || '').toLowerCase();
            return r !== 'system admin' && r !== 'super admin';
          });
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to fetch employees');
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Fetch employee statistics
    async fetchEmployeeStats() {
      try {
        const response = await fetch(`${apiConfig.baseURL}/employees/stats`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          this.employeeStats = data.data;
          return data.data;
        } else {
          throw new Error(
            data.message || 'Failed to fetch employee statistics'
          );
        }
      } catch (error) {
        console.error('Error fetching employee stats:', error);
        this.setError(error.message);
        throw error;
      }
    },

    // Fetch employee by ID
    async fetchEmployeeById(id) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(`${apiConfig.baseURL}/employees/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Employee not found');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          this.selectedEmployee = data.data;
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to fetch employee');
        }
      } catch (error) {
        console.error('Error fetching employee:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Fetch employee by employee ID
    async fetchEmployeeByEmployeeId(employeeId) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/employees/employee-id/${employeeId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Employee not found');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to fetch employee');
        }
      } catch (error) {
        console.error('Error fetching employee by employee ID:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Create new employee
    async createEmployee(employeeData) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(`${apiConfig.baseURL}/employees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(employeeData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || `HTTP error! status: ${response.status}`
          );
        }

        if (data.success) {
          // Add new employee to the store
          this.employees.unshift(data.data);

          // Update stats
          this.employeeStats.total_employees += 1;
          this.employeeStats.active_employees += 1;
          this.employeeStats.new_this_month += 1;

          return data.data;
        } else {
          throw new Error(data.message || 'Failed to create employee');
        }
      } catch (error) {
        console.error('Error creating employee:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Create new employee with photo (multipart)
    async createEmployeeWithPhoto(formData) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(`${apiConfig.baseURL}/employees/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || `HTTP error! status: ${response.status}`
          );
        }

        if (data.success) {
          this.employees.unshift(data.data);
          this.employeeStats.total_employees += 1;
          if ((data.data.status || 'Active') === 'Active') {
            this.employeeStats.active_employees += 1;
          }
          this.employeeStats.new_this_month += 1;
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to create employee');
        }
      } catch (error) {
        console.error('Error creating employee with photo:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Update employee
    async updateEmployee(id, employeeData) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(`${apiConfig.baseURL}/employees/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(employeeData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || `HTTP error! status: ${response.status}`
          );
        }

        if (data.success) {
          // Update employee in the store
          const index = this.employees.findIndex(
            (emp) => emp.id === parseInt(id)
          );
          if (index !== -1) {
            this.employees[index] = data.data;
          }

          // Update selected employee if it's the same one
          if (
            this.selectedEmployee &&
            this.selectedEmployee.id === parseInt(id)
          ) {
            this.selectedEmployee = data.data;
          }

          return data.data;
        } else {
          throw new Error(data.message || 'Failed to update employee');
        }
      } catch (error) {
        console.error('Error updating employee:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Update employee status
    async updateEmployeeStatus(id, status) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/employees/${id}/status`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ status }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || `HTTP error! status: ${response.status}`
          );
        }

        if (data.success) {
          // Update employee in the store
          const index = this.employees.findIndex(
            (emp) => emp.id === parseInt(id)
          );
          if (index !== -1) {
            const oldStatus = this.employees[index].status;
            this.employees[index] = data.data;

            // Update stats if status changed
            if (oldStatus === 'Active' && status !== 'Active') {
              this.employeeStats.active_employees -= 1;
            } else if (oldStatus !== 'Active' && status === 'Active') {
              this.employeeStats.active_employees += 1;
            }
          }

          return data.data;
        } else {
          throw new Error(data.message || 'Failed to update employee status');
        }
      } catch (error) {
        console.error('Error updating employee status:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Delete employee (soft delete)
    async deleteEmployee(id) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(`${apiConfig.baseURL}/employees/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || `HTTP error! status: ${response.status}`
          );
        }

        if (data.success) {
          // Remove employee from the store (or mark as deleted)
          const index = this.employees.findIndex(
            (emp) => emp.id === parseInt(id)
          );
          if (index !== -1) {
            const employee = this.employees[index];
            if (employee.status === 'Active') {
              this.employeeStats.active_employees -= 1;
            }
            this.employeeStats.total_employees -= 1;
            this.employees.splice(index, 1);
          }

          return data.data;
        } else {
          throw new Error(data.message || 'Failed to delete employee');
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Restore employee
    async restoreEmployee(id) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/employees/${id}/restore`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || `HTTP error! status: ${response.status}`
          );
        }

        if (data.success) {
          // Add restored employee back to the store
          this.employees.unshift(data.data);
          this.employeeStats.total_employees += 1;
          if (data.data.status === 'Active') {
            this.employeeStats.active_employees += 1;
          }

          return data.data;
        } else {
          throw new Error(data.message || 'Failed to restore employee');
        }
      } catch (error) {
        console.error('Error restoring employee:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Fetch employees by department
    async fetchEmployeesByDepartment(department) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/employees?department=${encodeURIComponent(department)}`,
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
          return data.data;
        } else {
          throw new Error(
            data.message || 'Failed to fetch department employees'
          );
        }
      } catch (error) {
        console.error('Error fetching department employees:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Clear selected employee
    clearSelectedEmployee() {
      this.selectedEmployee = null;
    },

    // Refresh all data
    async refreshData() {
      await Promise.all([this.fetchEmployees(), this.fetchEmployeeStats()]);
    },
  },
});
