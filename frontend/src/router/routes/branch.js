// Branch components
const BranchDashboard = () => import('../../views/branch/BranchDashboard.vue');
const BranchSales = () => import('../../views/branch/BranchSales.vue');
const BranchInventory = () => import('../../views/branch/BranchInventory.vue');
const BranchEmployees = () => import('../../views/branch/BranchEmployees.vue');
const BranchProfile = () => import('../../views/branch/BranchProfile.vue');

// Import store for branch status check
import { useBranchStore } from '../../stores/branchStore';

// Role-based access control
const rolePermissions = {
  'Super Admin': [
    'dashboard',
    'sales',
    'utilities',
    'inventory',
    'kitchen',
    'employees',
    'profile',
    'attendance',
  ],
  Manager: [
    'dashboard',
    'sales',
    'utilities',
    'inventory',
    'kitchen',
    'employees',
    'profile',
    'attendance',
  ],
  Cashier: ['dashboard', 'profile', 'attendance'],
  Cook: ['dashboard', 'kitchen', 'inventory', 'profile', 'attendance'],
  Waiter: ['dashboard', 'profile', 'attendance'],
  // Allow Kitchen Assistant to access relevant branch areas
  'Kitchen Assistant': ['dashboard', 'profile', 'attendance'],
};

// Route guard for role-based access
async function checkBranchAccess(to, from, next) {
  // Get user from auth store (will be implemented)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role;
  const userDepartment = user.department;
  const userBranchId = user.branch_id;

  // Allow access if user is Super Admin or has a branch_id (indicating they're assigned to a branch)
  if (userRole === 'Super Admin' || userBranchId) {
    // Extract operation from route name (e.g., 'BranchInventory' -> 'inventory')
    const operation =
      to.name?.replace('Branch', '').toLowerCase() || 'dashboard';

    // Super Admin has access to all operations
    if (userRole === 'Super Admin') {
      next();
      return;
    }

    // Check if branch is inactive (for non-Super Admin users)
    if (userBranchId && userRole !== 'Super Admin') {
      try {
        const branchStore = useBranchStore();

        // Try to get branch from store first
        let branch = branchStore.getBranchById(userBranchId);

        // If not in store, fetch it
        if (!branch) {
          branch = await branchStore.fetchBranchById(userBranchId);
        }

        // Check if branch is inactive
        if (branch && branch.is_active === false) {
          // Allow access to inactive and profile routes only
          const allowedInactiveRoutes = ['BranchInactive', 'BranchProfile'];
          if (!allowedInactiveRoutes.includes(to.name)) {
            console.warn('Branch is inactive, redirecting to inactive page');
            next('/branch/inactive');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking branch status:', error);
        // If we can't check branch status, allow access (fail open)
      }
    }

    // Check role permissions for other roles
    const allowedOperations = rolePermissions[userRole] || [];
    if (!allowedOperations.includes(operation)) {
      console.warn(`Access denied: ${userRole} cannot access ${operation}`);
      next('/branch/dashboard'); // Redirect to branch dashboard
      return;
    }

    next();
    return;
  }

  // If not authorized, redirect to login
  console.warn('User not authorized for branch operations');
  next('/login');
}

// Branch routes
export default [
  {
    path: '',
    redirect: '/branch/dashboard',
  },
  {
    path: 'dashboard',
    name: 'BranchDashboard',
    component: BranchDashboard,
    beforeEnter: checkBranchAccess,
    meta: {
      title: 'Branch Dashboard',
      requiresAuth: true,
      operation: 'dashboard',
    },
  },
  {
    path: 'sales',
    name: 'BranchSales',
    component: BranchSales,
    beforeEnter: checkBranchAccess,
    meta: {
      title: 'Sales Management',
      requiresAuth: true,
      operation: 'sales',
    },
  },
  {
    path: 'utilities',
    name: 'BranchUtilities',
    component: () => import('../../views/branch/BranchUtilities.vue'),
    beforeEnter: checkBranchAccess,
    meta: {
      title: 'Monthly Utilities',
      requiresAuth: true,
      operation: 'utilities',
    },
  },
  {
    path: 'kitchen',
    name: 'BranchKitchen',
    component: () => import('../../views/branch/BranchKitchen.vue'),
    beforeEnter: checkBranchAccess,
    meta: {
      title: 'Kitchen',
      requiresAuth: true,
      operation: 'kitchen',
    },
  },
  {
    path: 'inventory',
    name: 'BranchInventory',
    component: BranchInventory,
    beforeEnter: checkBranchAccess,
    meta: {
      title: 'Branch Inventory',
      requiresAuth: true,
      operation: 'inventory',
    },
  },
  {
    path: 'employees',
    name: 'BranchEmployees',
    component: BranchEmployees,
    beforeEnter: checkBranchAccess,
    meta: {
      title: 'Employee Management',
      requiresAuth: true,
      operation: 'employees',
    },
  },
  {
    path: 'profile',
    name: 'BranchProfile',
    component: BranchProfile,
    beforeEnter: checkBranchAccess,
    meta: {
      title: 'Employee Profile',
      requiresAuth: true,
      operation: 'profile',
    },
  },
  {
    path: 'attendance',
    name: 'BranchAttendance',
    component: () => import('../../views/branch/BranchAttendance.vue'),
    beforeEnter: checkBranchAccess,
    meta: {
      title: 'My Attendance',
      requiresAuth: true,
      operation: 'attendance',
    },
  },
  {
    path: 'inactive',
    name: 'BranchInactive',
    component: () => import('../../views/branch/BranchInactive.vue'),
    meta: {
      title: 'Branch Not Active',
      requiresAuth: true,
    },
  },
];
