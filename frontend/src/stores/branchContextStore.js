import { defineStore } from 'pinia';
import { useAuthStore } from './authStore';
import { useBranchStore } from './branchStore';

export const useBranchContextStore = defineStore('branchContext', {
  state: () => ({
    currentBranch: null,
    availableBranches: [],
    userRole: null,
    isSuperAdmin: false,
    isStaffOrManager: false,
    loading: false,
    error: null,
  }),

  getters: {
    // Get current branch information
    getCurrentBranch: (state) => state.currentBranch,

    // Check if user can access specific operations
    canAccessPOS: (state) => {
      const allowedRoles = ['Manager', 'Cashier'];
      return allowedRoles.includes(state.userRole);
    },

    canAccessSales: (state) => {
      return state.userRole === 'Manager';
    },

    canAccessInventory: (state) => {
      const allowedRoles = ['Manager', 'Cook'];
      return allowedRoles.includes(state.userRole);
    },

    canAccessEmployees: (state) => {
      return state.userRole === 'Manager';
    },

    canAccessProfile: () => true, // All roles can access profile

    // Get available operations for current user
    availableOperations: (state) => {
      const rolePermissions = {
        Manager: ['dashboard', 'sales', 'inventory', 'employees', 'profile'],
        Cashier: ['dashboard', 'profile'],
        Cook: ['dashboard', 'inventory', 'profile'],
        Waiter: ['dashboard', 'profile'],
      };

      return rolePermissions[state.userRole] || ['dashboard', 'profile'];
    },

    // Check if user can switch branches (only Super Admin)
    canSwitchBranches: (state) => state.isSuperAdmin,
  },

  actions: {
    // Initialize branch context from user data
    async initializeBranchContext() {
      this.loading = true;
      this.error = null;

      try {
        const authStore = useAuthStore();
        const user = authStore.user;

        if (!user) {
          throw new Error('No user found');
        }

        console.log('Full user object from authStore:', user);
        console.log('User branch_id from authStore:', user.branch_id);

        // Also check localStorage in case there's a sync issue
        const localStorageUser = JSON.parse(
          localStorage.getItem('user') || '{}'
        );
        console.log('User from localStorage:', localStorageUser);
        console.log('Branch_id from localStorage:', localStorageUser.branch_id);

        this.userRole = user.role;
        this.isSuperAdmin = user.role === 'Super Admin';
        this.isStaffOrManager = !this.isSuperAdmin;

        if (this.isSuperAdmin) {
          // Super Admin can access all branches
          const branchStore = useBranchStore();
          await branchStore.fetchActiveBranches();
          this.availableBranches = branchStore.activeBranches;
        } else {
          // Staff and Managers are assigned to specific branch
          if (user.branch_id) {
            console.log('User has branch_id:', user.branch_id);
            const branchStore = useBranchStore();

            // First try to find the branch in the already fetched branches
            let branch = branchStore.getBranchById(user.branch_id);

            if (!branch) {
              // If not found, fetch it from API
              console.log('Branch not found in store, fetching from API...');
              try {
                branch = await branchStore.fetchBranchById(user.branch_id);
                console.log('Successfully fetched branch from API:', branch);
              } catch (error) {
                console.error('Error fetching branch from API:', error);
                throw new Error(
                  `Failed to fetch branch with ID ${user.branch_id}: ${error.message}`
                );
              }
            }

            console.log('Found branch:', branch);
            this.currentBranch = branch;
            this.availableBranches = [branch];
          } else {
            // User doesn't have branch assignment yet - allow access but show message
            console.warn(
              'User not assigned to any branch - allowing access for branch assignment'
            );
            this.currentBranch = null;
            this.availableBranches = [];
          }
        }

        return true;
      } catch (error) {
        console.error('Error initializing branch context:', error);
        this.error = error.message;
        return false;
      } finally {
        this.loading = false;
      }
    },

    // Set current branch (for Super Admin branch selection)
    async setCurrentBranch(branchId) {
      if (!this.isSuperAdmin) {
        throw new Error('Only Super Admin can switch branches');
      }

      this.loading = true;
      try {
        const branchStore = useBranchStore();
        const branch = await branchStore.fetchBranchById(branchId);
        this.currentBranch = branch;

        // Store selection in localStorage for persistence
        localStorage.setItem('selectedBranchId', branchId.toString());

        return branch;
      } catch (error) {
        console.error('Error setting current branch:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Get current branch or throw error if not set
    requireCurrentBranch() {
      if (!this.currentBranch) {
        throw new Error('No branch context available');
      }
      return this.currentBranch;
    },

    // Clear branch context (for logout)
    clearBranchContext() {
      this.currentBranch = null;
      this.availableBranches = [];
      this.userRole = null;
      this.isSuperAdmin = false;
      this.isStaffOrManager = false;
      this.error = null;
      localStorage.removeItem('selectedBranchId');
    },

    // Restore branch context from localStorage (for Super Admin)
    async restoreBranchContext() {
      if (!this.isSuperAdmin) return;

      const savedBranchId = localStorage.getItem('selectedBranchId');
      if (savedBranchId) {
        try {
          await this.setCurrentBranch(parseInt(savedBranchId));
        } catch (error) {
          console.warn('Failed to restore branch context:', error);
          localStorage.removeItem('selectedBranchId');
        }
      }
    },

    // Check if user has access to specific operation
    hasAccess(operation) {
      return this.availableOperations.includes(operation);
    },

    // Set error state
    setError(error) {
      this.error = error;
    },

    // Clear error state
    clearError() {
      this.error = null;
    },
  },
});
