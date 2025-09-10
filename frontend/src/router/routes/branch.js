// Branch components
const BranchDashboard = () => import('../../views/branch/BranchDashboard.vue');
const BranchSales = () => import('../../views/branch/BranchSales.vue');
const BranchInventory = () => import('../../views/branch/BranchInventory.vue');
const BranchEmployees = () => import('../../views/branch/BranchEmployees.vue');
const BranchProfile = () => import('../../views/branch/BranchProfile.vue');

// Role-based access control
const rolePermissions = {
  Manager: ['dashboard', 'sales', 'inventory', 'employees', 'profile'],
  Cashier: ['dashboard', 'profile'],
  Cook: ['dashboard', 'inventory', 'profile'],
  Waiter: ['dashboard', 'profile'],
};

// Route guard for role-based access
function checkBranchAccess(to, from, next) {
  // Get user from auth store (will be implemented)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role;
  const userDepartment = user.department;
  const userBranchId = user.branch_id;

  // Allow access if user is Super Admin or from Branch department
  if (userRole === 'Super Admin' || userDepartment === 'Branch') {
    // Extract operation from route name (e.g., 'BranchPOS' -> 'pos')
    const operation =
      to.name?.replace('Branch', '').toLowerCase() || 'dashboard';

    // Check role permissions
    const allowedOperations = rolePermissions[userRole] || [];
    if (!allowedOperations.includes(operation)) {
      console.warn(`Access denied: ${userRole} cannot access ${operation}`);
      next('/branch/dashboard'); // Redirect to branch dashboard
      return;
    }

    next();
    return;
  }

  // If not Branch department or Super Admin, redirect to main dashboard
  console.warn('User not authorized for branch operations');
  next('/dashboard');
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
];
