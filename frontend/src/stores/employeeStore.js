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
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    hasMore: true,
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

    // Fetch all employees with pagination
    async fetchEmployees(
      includeDeleted = false,
      page = 1,
      limit = 10,
      append = false
    ) {
      this.setLoading(true);
      this.clearError();

      try {
        const params = new URLSearchParams();
        if (includeDeleted) params.append('includeDeleted', 'true');
        params.append('page', page.toString());
        params.append('limit', limit.toString());

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
          const filteredEmployees = (data.data || []).filter((e) => {
            const r = (e.role || '').toLowerCase();
            return r !== 'system admin' && r !== 'super admin';
          });

          if (append) {
            // Append to existing employees for lazy loading
            this.employees = [...this.employees, ...filteredEmployees];
          } else {
            // Replace employees for new search/filter
            this.employees = filteredEmployees;
          }

          // Update pagination info
          this.pagination = data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          };

          // Update hasMore flag
          this.hasMore = data.pagination?.hasNext || false;

          return {
            data: filteredEmployees,
            pagination: data.pagination,
          };
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

    // Load more employees for lazy loading
    async loadMoreEmployees(includeDeleted = false) {
      if (!this.hasMore || this.loading) return;

      const nextPage = this.pagination.page + 1;
      await this.fetchEmployees(
        includeDeleted,
        nextPage,
        this.pagination.limit,
        true
      );
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

          // Return both employee data and email status
          return {
            ...data.data,
            emailStatus: data.emailStatus || { sent: false, error: null },
          };
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

          // Return both employee data and email status
          return {
            ...data.data,
            emailStatus: data.emailStatus || { sent: false, error: null },
          };
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

    // Comprehensive employee termination
    async terminateEmployee(id, terminationData) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/employees/${id}/terminate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(terminationData),
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
            this.employees[index] = data.data.employee;

            // Update stats if status changed from Active to Terminated
            if (oldStatus === 'Active') {
              this.employeeStats.active_employees -= 1;
            }
          }

          return data.data;
        } else {
          throw new Error(data.message || 'Failed to terminate employee');
        }
      } catch (error) {
        console.error('Error terminating employee:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Get termination record for an employee
    async getTerminationRecord(id) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/employees/${id}/termination`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            return null; // No termination record found
          }
          throw new Error(
            data.message || `HTTP error! status: ${response.status}`
          );
        }

        if (data.success) {
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to fetch termination record');
        }
      } catch (error) {
        console.error('Error fetching termination record:', error);
        this.setError(error.message);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Update termination checklist
    async updateTerminationChecklist(id, checklistData) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/employees/${id}/termination/checklist`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(checklistData),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || `HTTP error! status: ${response.status}`
          );
        }

        if (data.success) {
          return data.data;
        } else {
          throw new Error(
            data.message || 'Failed to update termination checklist'
          );
        }
      } catch (error) {
        console.error('Error updating termination checklist:', error);
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

    // Restore terminated employee back to active status
    async restoreTerminatedEmployee(id) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/employees/${id}/restore-terminated`,
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
          // Update the employee in the store
          const employeeIndex = this.employees.findIndex(
            (emp) => emp.id === id
          );
          if (employeeIndex !== -1) {
            this.employees[employeeIndex] = data.data;
          }

          // Update stats
          this.employeeStats.active_employees += 1;

          return data.data;
        } else {
          throw new Error(
            data.message || 'Failed to restore terminated employee'
          );
        }
      } catch (error) {
        console.error('Error restoring terminated employee:', error);
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

    // Fetch employees for birthday filtering (by department or branch)
    async fetchEmployeesForBirthdays(branchId, department) {
      try {
        let employees = [];

        if (branchId) {
          // Fetch branch employees
          const response = await fetch(
            `${apiConfig.baseURL}/branches/${branchId}/employees`,
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
          employees = Array.isArray(data) ? data : data.data || [];
        } else if (department) {
          // Fetch department employees
          employees = await this.fetchEmployeesByDepartment(department);
        } else {
          // No branch or department specified
          return [];
        }

        // Filter out System/Super Admin and deleted employees
        return employees.filter((emp) => {
          const role = (emp.role || '').toLowerCase();
          return (
            role !== 'system admin' && role !== 'super admin' && !emp.deleted_at
          );
        });
      } catch (error) {
        console.error('Error fetching employees for birthdays:', error);
        // Return empty array on error (non-blocking)
        return [];
      }
    },

    // Fetch departments with their available roles
    async fetchDepartmentsWithRoles() {
      this.setLoading(true);
      this.clearError();

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
          return data.data;
        } else {
          throw new Error(
            data.message || 'Failed to fetch departments with roles'
          );
        }
      } catch (error) {
        console.error('Error fetching departments with roles:', error);
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
