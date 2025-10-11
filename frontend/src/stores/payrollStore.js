import { defineStore } from 'pinia';
import { apiConfig } from '../config/api.js';

export const usePayrollStore = defineStore('payroll', {
  state: () => ({
    payrollPeriods: [],
    selectedPeriod: null,
    loading: false,
    error: null,
    pagination: {
      total: 0,
      limit: 20,
      offset: 0,
    },
  }),

  getters: {
    // Get payroll records from selected period
    payrollRecords: (state) => {
      return state.selectedPeriod?.records || [];
    },

    // Get periods by status
    periodsByStatus: (state) => (status) => {
      if (!status) return state.payrollPeriods;
      return state.payrollPeriods.filter((p) => p.status === status);
    },

    // Get pending approval count
    pendingApprovalCount: (state) => {
      return state.payrollPeriods.filter((p) => p.status === 'pending_approval')
        .length;
    },
  },

  actions: {
    /**
     * Generate payroll for department or branch
     * @param {Object} payload - Payroll generation parameters
     * @param {string} payload.type - 'department' or 'branch'
     * @param {string|number} payload.scope - department name or branch id
     * @param {string} payload.period_type - 'weekly', 'bi-weekly', 'monthly'
     * @param {string} payload.date_from - Start date
     * @param {string} payload.date_to - End date
     * @param {string} payload.period_name - Optional period name
     * @param {string} payload.generated_by - Employee ID who generated
     * @param {string} payload.remarks - Optional remarks
     */
    async generatePayroll(payload) {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(`${apiConfig.baseURL}/payroll/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to generate payroll');
        }

        if (data.success) {
          // Add the new period to the list
          this.payrollPeriods.unshift(data.data);
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to generate payroll');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch payroll periods with filters
     * @param {Object} filters
     */
    async fetchPayrollPeriods(filters = {}) {
      this.loading = true;
      this.error = null;

      try {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.department) params.append('department', filters.department);
        if (filters.branch_id) params.append('branch_id', filters.branch_id);
        if (filters.limit) params.append('limit', filters.limit);
        if (filters.offset) params.append('offset', filters.offset);

        const response = await fetch(
          `${apiConfig.baseURL}/payroll/periods?${params}`,
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
          throw new Error(data.message || 'Failed to fetch payroll periods');
        }

        if (data.success) {
          this.payrollPeriods = data.data || [];
          this.pagination = {
            total: data.total || 0,
            limit: data.limit || 20,
            offset: data.offset || 0,
          };
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to fetch payroll periods');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch period details with records
     * @param {number} id
     */
    async fetchPeriodDetails(id) {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/payroll/periods/${id}`,
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
          throw new Error(data.message || 'Failed to fetch period details');
        }

        if (data.success) {
          this.selectedPeriod = data.data;
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to fetch period details');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Submit payroll to Finance for approval
     * @param {number} id
     */
    async submitToFinance(id) {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/payroll/periods/${id}/submit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to submit payroll');
        }

        if (data.success) {
          // Update the period in the list
          const index = this.payrollPeriods.findIndex((p) => p.id === id);
          if (index !== -1) {
            this.payrollPeriods[index] = data.data;
          }
          if (this.selectedPeriod && this.selectedPeriod.id === id) {
            this.selectedPeriod = { ...this.selectedPeriod, ...data.data };
          }
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to submit payroll');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Approve payroll (Finance role)
     * @param {number} id
     * @param {string} remarks
     */
    async approvePayroll(id, remarks = null) {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/payroll/periods/${id}/approve`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ remarks }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to approve payroll');
        }

        if (data.success) {
          // Update the period in the list
          const index = this.payrollPeriods.findIndex((p) => p.id === id);
          if (index !== -1) {
            this.payrollPeriods[index] = data.data;
          }
          if (this.selectedPeriod && this.selectedPeriod.id === id) {
            this.selectedPeriod = { ...this.selectedPeriod, ...data.data };
          }
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to approve payroll');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Send approved payroll to budget release (Finance role)
     * @param {number} id - Payroll period ID
     * @param {number} releasedBy - Employee ID of the person releasing (optional, will use from token)
     */
    async sendToBudgetRelease(id, releasedBy = null) {
      this.loading = true;
      this.error = null;

      try {
        const period =
          this.selectedPeriod || this.payrollPeriods.find((p) => p.id === id);

        if (!period) {
          throw new Error('Payroll period not found');
        }

        // Get user ID from token if not provided
        const userId =
          releasedBy ||
          JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id;

        // Calculate total amount (net salary + employer contributions)
        const response = await fetch(
          `${apiConfig.baseURL}/budget-releases/payroll`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              payroll_period_id: id,
              amount: Number(period.total_net_amount) || 0,
              released_by: userId,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || 'Failed to create budget release for payroll'
          );
        }

        if (data.success) {
          // Refresh the payroll period to get updated status
          await this.fetchPeriodDetails(id);
          return data.data;
        } else {
          throw new Error(
            data.message || 'Failed to create budget release for payroll'
          );
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Reject payroll (Finance role)
     * @param {number} id
     * @param {string} remarks
     */
    async rejectPayroll(id, remarks) {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/payroll/periods/${id}/reject`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ remarks }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to reject payroll');
        }

        if (data.success) {
          // Update the period in the list
          const index = this.payrollPeriods.findIndex((p) => p.id === id);
          if (index !== -1) {
            this.payrollPeriods[index] = data.data;
          }
          if (this.selectedPeriod && this.selectedPeriod.id === id) {
            this.selectedPeriod = { ...this.selectedPeriod, ...data.data };
          }
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to reject payroll');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Release payroll to employees
     * @param {number} id
     */
    async releasePayroll(id) {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/payroll/periods/${id}/release`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to release payroll');
        }

        if (data.success) {
          // Update the period in the list
          const index = this.payrollPeriods.findIndex((p) => p.id === id);
          if (index !== -1) {
            this.payrollPeriods[index] = data.data;
          }
          if (this.selectedPeriod && this.selectedPeriod.id === id) {
            this.selectedPeriod = { ...this.selectedPeriod, ...data.data };
          }
          // Return full response including email summary and message
          return {
            ...data.data,
            message: data.message,
            emailSummary: data.emailSummary,
          };
        } else {
          throw new Error(data.message || 'Failed to release payroll');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update a payroll record
     * @param {number} periodId
     * @param {number} recordId
     * @param {Object} updates
     */
    async updatePayrollRecord(periodId, recordId, updates) {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/payroll/periods/${periodId}/records/${recordId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(updates),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to update payroll record');
        }

        if (data.success) {
          // Update the record in the selected period
          if (this.selectedPeriod && this.selectedPeriod.id === periodId) {
            const recordIndex = this.selectedPeriod.records.findIndex(
              (r) => r.id === recordId
            );
            if (recordIndex !== -1) {
              this.selectedPeriod.records[recordIndex] = data.data;
            }
          }
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to update payroll record');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Delete a draft payroll period
     * @param {number} id
     */
    async deletePayrollPeriod(id) {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/payroll/periods/${id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to delete payroll period');
        }

        if (data.success) {
          // Remove from the list
          this.payrollPeriods = this.payrollPeriods.filter((p) => p.id !== id);
          if (this.selectedPeriod && this.selectedPeriod.id === id) {
            this.selectedPeriod = null;
          }
          return true;
        } else {
          throw new Error(data.message || 'Failed to delete payroll period');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Get employee payroll history
     * @param {number} employeeId
     */
    async getEmployeePayrollHistory(employeeId) {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(
          `${apiConfig.baseURL}/payroll/records/${employeeId}`,
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
          throw new Error(data.message || 'Failed to fetch payroll history');
        }

        if (data.success) {
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to fetch payroll history');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Clear error
     */
    clearError() {
      this.error = null;
    },

    /**
     * Clear selected period
     */
    clearSelectedPeriod() {
      this.selectedPeriod = null;
    },
  },
});
