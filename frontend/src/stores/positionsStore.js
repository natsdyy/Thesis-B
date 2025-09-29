import { defineStore } from 'pinia';
import { apiConfig } from '../config/api.js';

export const usePositionsStore = defineStore('positions', {
  state: () => ({
    positions: {},
    loading: false,
    error: null,
    updatingPositionId: null,
  }),

  getters: {
    // Get all departments
    departments: (state) => Object.keys(state.positions),

    // Get positions by department
    getPositionsByDepartment: (state) => (department) => {
      return state.positions[department] || [];
    },

    // Get total number of positions
    totalPositions: (state) => {
      return Object.values(state.positions).reduce(
        (total, positions) => total + positions.length,
        0
      );
    },

    // Get position by ID
    getPositionById: (state) => (roleId) => {
      for (const department in state.positions) {
        const position = state.positions[department].find(
          (p) => p.role_id === roleId
        );
        if (position) return position;
      }
      return null;
    },
  },

  actions: {
    // Fetch all positions grouped by department
    async fetchPositions(includeDeleted = false) {
      try {
        this.loading = true;
        this.error = null;

        const response = await fetch(
          `${apiConfig.baseURL}/roles/positions${includeDeleted ? '?includeDeleted=true' : ''}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          this.positions = data.data;
        } else {
          throw new Error(data.message || 'Failed to fetch positions');
        }
      } catch (error) {
        console.error('Error fetching positions:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Fetch positions by department
    async fetchPositionsByDepartment(department, includeDeleted = false) {
      try {
        this.loading = true;
        this.error = null;

        const response = await fetch(
          `${apiConfig.baseURL}/roles/positions/department/${encodeURIComponent(department)}${includeDeleted ? '?includeDeleted=true' : ''}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          // Update the specific department in positions
          this.positions[department] = data.data;
        } else {
          throw new Error(
            data.message || 'Failed to fetch positions by department'
          );
        }
      } catch (error) {
        console.error('Error fetching positions by department:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Update rate per hour for a position
    async updatePositionRate(roleId, ratePerHour) {
      try {
        this.updatingPositionId = roleId;
        this.error = null;

        const response = await fetch(
          `${apiConfig.baseURL}/roles/positions/${roleId}/rate`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              rate_per_hour: ratePerHour,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          // Update the position in the local state
          const updatedPosition = data.data;
          const department = updatedPosition.department;

          if (this.positions[department]) {
            const index = this.positions[department].findIndex(
              (p) => p.role_id === updatedPosition.role_id
            );

            if (index !== -1) {
              this.positions[department][index] = updatedPosition;
            }
          }

          return updatedPosition;
        } else {
          throw new Error(data.message || 'Failed to update position rate');
        }
      } catch (error) {
        console.error('Error updating position rate:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.updatingPositionId = null;
      }
    },

    // Get a specific position by ID
    async fetchPositionById(roleId) {
      try {
        this.loading = true;
        this.error = null;

        const response = await fetch(
          `${apiConfig.baseURL}/roles/positions/${roleId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          return data.data;
        } else {
          throw new Error(data.message || 'Failed to fetch position');
        }
      } catch (error) {
        console.error('Error fetching position by ID:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Clear error
    clearError() {
      this.error = null;
    },

    // Reset state
    resetState() {
      this.positions = {};
      this.loading = false;
      this.error = null;
      this.updatingPositionId = null;
    },
  },
});
