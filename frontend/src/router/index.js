import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

// Import route modules
import hrRoutes from './routes/hr';
import scmRoutes from './routes/scm';
import financeRoutes from './routes/finance';
import productionRoutes from './routes/production';
import crmRoutes from './routes/crm';
import adminRoutes from './routes/admin';
import branchRoutes from './routes/branch';

// Import layout components
import DashboardLayout from '../layouts/DashboardLayout.vue';
import BranchLayout from '../layouts/BranchLayout.vue';

// Import page components
import HomePage from '../views/HomePage.vue';
import NotFound from '../views/NotFound.vue';
import Login from '../views/Login.vue';

// Import crm components
import FullMenu from '../components/crm/FullMenu.vue';
import Homepage from '../components/crm/homepage.vue';
import StoreDirectory from '../components/crm/StoreDirectory.vue';
const routes = [
  // crm route
  {
    path: '/',
    name: 'HomePage',
    component: Homepage,
    meta: { title: 'Countryside Steakhouse - Home' },
  },
  // crm menu route
  {
    path: '/menu',
    name: 'FullMenu',
    component: FullMenu,
    meta: { title: 'Full Menu' },
  },
  // crm store directory route
  {
    path: '/stores',
    name: 'StoreDirectory',
    component: StoreDirectory,
    meta: { title: 'Store Directory' },
  },
  // Add login route
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: 'Login' },
  },
  {
    path: '/dashboard',
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: HomePage,
        meta: { title: 'Dashboard', requiresAuth: true },
      },
    ],
  },
  // Human Resource routes
  {
    path: '/hr',
    component: DashboardLayout,
    children: hrRoutes,
    meta: {
      title: 'Human Resource',
      department: 'Human Resource',
      requiresAuth: true,
      requiresDepartmentAccess: true,
    },
  },
  // Supply Chain routes
  {
    path: '/scm',
    component: DashboardLayout,
    children: scmRoutes,
    meta: {
      title: 'Supply Chain Management',
      department: 'SCM',
      requiresAuth: true,
      requiresDepartmentAccess: true,
    },
  },
  // Finance routes
  {
    path: '/finance',
    component: DashboardLayout,
    children: financeRoutes,
    meta: {
      title: 'Finance',
      department: 'Finance',
      requiresAuth: true,
      requiresDepartmentAccess: true,
    },
  },
  // Production routes
  {
    path: '/production',
    component: DashboardLayout,
    children: productionRoutes,
    meta: {
      title: 'Production',
      department: 'Production',
      requiresAuth: true,
      requiresDepartmentAccess: true,
    },
  },
  // CRM routes
  {
    path: '/crm',
    component: DashboardLayout,
    children: crmRoutes,
    meta: {
      title: 'Customer Relationship Management',
      department: 'CRM',
      requiresAuth: true,
      requiresDepartmentAccess: true,
    },
  },
  // Admin routes (Super Admin only)
  {
    path: '/admin',
    component: DashboardLayout,
    children: adminRoutes,
    meta: {
      title: 'System Administration',
      department: 'System',
      requiresAuth: true,
      requiresDepartmentAccess: true,
      adminOnly: true, // Only Super Admin
    },
  },
  // Branch routes
  {
    path: '/branch',
    component: BranchLayout,
    children: branchRoutes,
    meta: {
      title: 'Branch Operations',
      department: 'Branch',
      requiresAuth: true,
      requiresDepartmentAccess: true,
    },
  },
  // Standalone POS route (separate from branch layout)
  {
    path: '/pos',
    name: 'POS',
    component: () => import('../views/branch/BranchPOS.vue'),
    meta: {
      title: 'Point of Sale',
      requiresAuth: true,
      requiresDepartmentAccess: true,
    },
  },
  // Order rating route (public - no auth required)
  {
    path: '/rate-order',
    name: 'OrderRating',
    component: () => import('../views/OrderRating.vue'),
    meta: {
      title: 'Rate Your Order',
    },
  },
  // 404 Not Found
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// Helper function to check department access
function canAccessDepartment(userRole, userDepartment, routeDepartment) {
  // Super Admin can access everything
  if (userRole === 'Super Admin') {
    return true;
  }

  // Users can only access their own department
  return userDepartment === routeDepartment;
}

// Helper function to check admin access
function canAccessAdminRoutes(userRole, userDepartment) {
  // Only Super Admin can access admin routes
  return userRole === 'Super Admin' && userDepartment === 'System';
}

// Add a global navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/home',
    '/menu',
    '/stores',
    '/rate-order',
  ];

  if (publicRoutes.includes(to.path)) {
    next();
    return;
  }

  // Check if user is authenticated
  if (!authStore.isAuthenticated || !authStore.user) {
    next('/login');
    return;
  }

  // Validate session for protected routes
  const isValidSession = await authStore.validateSession();

  if (!isValidSession) {
    // Session is invalid (role deleted/deactivated)
    next('/login');
    return;
  }

  // Get user information
  const userRole = authStore.userRole;
  const userDepartment = authStore.userDepartment;

  // Check if route requires authentication
  if (to.meta.requiresAuth && (!authStore.isAuthenticated || !authStore.user)) {
    next('/login');
    return;
  }

  // Check department access for routes that require it
  if (to.meta.requiresDepartmentAccess && to.meta.department) {
    const routeDepartment = to.meta.department;

    if (!canAccessDepartment(userRole, userDepartment, routeDepartment)) {
      // Redirect to their own department dashboard or main dashboard
      const userDashboard = getUserDashboardRoute(userDepartment);

      // Show an error message
      console.warn(
        `Access denied: User ${userRole} from ${userDepartment} department cannot access ${routeDepartment} routes`
      );

      next(userDashboard);
      return;
    }
  }

  // Check admin access for admin routes
  if (to.meta.adminOnly) {
    if (!canAccessAdminRoutes(userRole, userDepartment)) {
      // Redirect to their own department dashboard
      const userDashboard = getUserDashboardRoute(userDepartment);

      // Show an error message
      console.warn(
        `Access denied: Only Admin department users and Super Admin can access admin routes`
      );

      next(userDashboard);
      return;
    }
  }

  next();
});

// Helper function to get user's appropriate dashboard
function getUserDashboardRoute(userDepartment) {
  const departmentRoutes = {
    'Human Resource': '/hr/dashboard',
    Finance: '/finance/dashboard',
    SCM: '/scm/dashboard',
    Production: '/production/dashboard',
    CRM: '/crm/dashboard',
    Branch: '/branch/dashboard',
    System: '/admin/dashboard',
  };

  return departmentRoutes[userDepartment] || '/dashboard';
}

export default router;
