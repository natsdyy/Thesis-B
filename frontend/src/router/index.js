import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useSupplierAuthStore } from '../stores/supplierAuthStore';

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
import SupplierLayout from '../layouts/SupplierLayout.vue';

// Import page components
import HomePage from '../views/HomePage.vue';
import SuperAdminHome from '../views/SuperAdminHome.vue';
import FinancialStatement from '../views/FinancialStatement.vue';
import NotFound from '../views/NotFound.vue';
import Login from '../views/Login.vue';
import ForgotPassword from '../views/ForgotPassword.vue';
import ResetPassword from '../views/ResetPassword.vue';

// Import supplier components
import SupplierLogin from '../views/supplier/SupplierLogin.vue';
import ForgotPasswordSupplier from '../views/supplier/ForgotPasswordSupplier.vue';
import ResetPasswordSupplier from '../views/supplier/ResetPasswordSupplier.vue';
import SupplierDashboard from '../views/supplier/SupplierDashboard.vue';
import SupplierOrders from '../views/supplier/SupplierOrders.vue';
import SupplierProfile from '../views/supplier/SupplierProfile.vue';
import SupplierProducts from '../views/supplier/SupplierProducts.vue';

// Import crm components
import FullMenu from '../components/crm/FullMenu.vue';
import Homepage from '../components/crm/homepage.vue';
import StoreDirectory from '../components/crm/StoreDirectory.vue';
import JoinUs from '../components/crm/JoinUs.vue';
import FAQ from '../components/crm/FAQ.vue';
const routes = [
  // crm route
  {
    path: '/',
    name: 'HomePage',
    component: Homepage,
    meta: { title: 'Countryside Steakhouse - Home' },
  },
  // Public Queue Board (no auth)
  {
    path: '/queue',
    name: 'QueueBoard',
    component: () => import('../views/QueueBoard.vue'),
    meta: { title: 'Now Serving' },
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
  // Join Us route
  {
    path: '/join-us',
    name: 'JoinUs',
    component: JoinUs,
    meta: { title: 'Join Our Team' },
  },
  // FAQ route
  {
    path: '/faq',
    name: 'FAQ',
    component: FAQ,
    meta: { title: 'Frequently Asked Questions' },
  },
  // Add login route
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: 'Login' },
  },
  // Password reset routes
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
    meta: { title: 'Forgot Password' },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword,
    meta: { title: 'Reset Password' },
  },
  // Public onboarding route
  {
    path: '/onboard',
    name: 'OnboardEmployee',
    component: () => import('../views/public/OnboardEmployee.vue'),
    meta: { title: 'Employee Onboarding', public: true },
  },
  // Supplier routes
  {
    path: '/supplier/login',
    name: 'SupplierLogin',
    component: SupplierLogin,
    meta: { title: 'Supplier Login' },
  },
  {
    path: '/supplier/forgot-password',
    name: 'ForgotPasswordSupplier',
    component: ForgotPasswordSupplier,
    meta: { title: 'Forgot Password' },
  },
  {
    path: '/supplier/reset-password',
    name: 'ResetPasswordSupplier',
    component: ResetPasswordSupplier,
    meta: { title: 'Reset Password' },
  },
  {
    path: '/supplier',
    component: SupplierLayout,
    meta: { requiresSupplierAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'SupplierDashboard',
        component: SupplierDashboard,
        meta: { title: 'Supplier Dashboard', requiresSupplierAuth: true },
      },
      {
        path: 'orders',
        name: 'SupplierOrders',
        component: SupplierOrders,
        meta: { title: 'My Orders', requiresSupplierAuth: true },
      },
      {
        path: 'profile',
        name: 'SupplierProfile',
        component: SupplierProfile,
        meta: { title: 'My Profile', requiresSupplierAuth: true },
      },
      {
        path: 'products',
        name: 'SupplierProducts',
        component: SupplierProducts,
        meta: { title: 'My Products', requiresSupplierAuth: true },
      },
    ],
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
  // Super Admin Executive Dashboard
  {
    path: '/super-admin',
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'SuperAdminHome',
        component: SuperAdminHome,
        meta: {
          title: 'Executive Dashboard',
          requiresAuth: true,
          requiresRole: [
            'Super Admin',
            'Chairman of the Board',
            'Board of Directors',
          ],
          department: 'Administration',
        },
      },
      {
        path: 'financial-statement',
        name: 'FinancialStatement',
        component: FinancialStatement,
        meta: {
          title: 'Financial Statement',
          requiresAuth: true,
          requiresRole: [
            'Super Admin',
            'Chairman of the Board',
            'Board of Directors',
          ],
          department: 'Administration',
        },
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
      requiresDepartmentAccess: false, // Allow all users to access HR routes for attendance records
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
  // Admin routes (Super Admin, Chairman, and Board of Directors)
  {
    path: '/admin',
    component: DashboardLayout,
    children: adminRoutes,
    meta: {
      title: 'System Administration',
      department: 'Administration',
      requiresAuth: true,
      requiresDepartmentAccess: true,
      requiresRole: [
        'Super Admin',
        'Chairman of the Board',
        'Board of Directors',
      ],
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
  // Super Admin and Chairman can access everything
  if (userRole === 'Super Admin' || userRole === 'Chairman of the Board') {
    return true;
  }

  // Board of Directors can access Administration department
  if (
    userRole === 'Board of Directors' &&
    routeDepartment === 'Administration'
  ) {
    return true;
  }

  // Allow access to HR routes for all users (for attendance records)
  if (routeDepartment === 'Human Resource') {
    return true;
  }

  // Users can access their own department routes (both Staff and Manager)
  return userDepartment === routeDepartment;
}

// Helper function to check admin access
function canAccessAdminRoutes(userRole, userDepartment) {
  // Super Admin, Chairman, and Board of Directors can access admin routes
  return (
    (userRole === 'Super Admin' && userDepartment === 'System') ||
    userRole === 'Chairman of the Board' ||
    userRole === 'Board of Directors'
  );
}

// Helper function to get department from route path
function getDepartmentFromRoute(routePath) {
  if (routePath.startsWith('/hr/')) return 'Human Resource';
  if (routePath.startsWith('/scm/')) return 'SCM';
  if (routePath.startsWith('/finance/')) return 'Finance';
  if (routePath.startsWith('/production/')) return 'Production';
  if (routePath.startsWith('/crm/')) return 'CRM';
  if (routePath.startsWith('/branch/')) return 'Branch';
  if (routePath.startsWith('/admin/')) return 'Administration';
  return null;
}

// Helper function to check if route requires manager access
function requiresManagerAccess(routePath) {
  const managerOnlyRoutes = [
    // HR Manager routes
    '/hr/employee-manager',
    '/hr/add-employee',
    '/hr/schedules',
    '/hr/overtime-approval',
    '/hr/leave-approvals',
    '/hr/positions',
    '/hr/payroll-management',
    '/hr/attendance-records',

    // SCM Manager routes
    '/scm/dashboard',
    '/scm/request-supply',
    '/scm/purchase-order',
    '/scm/grn',
    '/scm/suppliers',

    // Finance Manager routes
    '/finance/dashboard',
    '/finance/request-approval',
    '/finance/payroll-approval',
    '/finance/budget-release',
    '/finance/cash-management',
    '/finance/sales',

    // Production Manager routes
    '/production/dashboard',
    '/production/menu-creation',
    '/production/recipes',
    '/production/quality-inspection',
    '/production/production-execution',

    // CRM Manager routes
    '/crm/dashboard',
    '/crm/customers-feedback',
    '/crm/analytics',
    '/crm/faqs',
  ];

  return managerOnlyRoutes.some((route) => routePath.startsWith(route));
}

// Helper function to check manager role access
function canAccessManagerRoutes(userRole) {
  // Super Admin, Chairman, and Manager roles can access manager routes
  return (
    userRole === 'Super Admin' ||
    userRole === 'Chairman of the Board' ||
    userRole === 'Manager'
  );
}

// Add a global navigation guard
router.beforeEach(async (to, from, next) => {
  // Check for supplier authentication
  if (to.matched.some((record) => record.meta.requiresSupplierAuth)) {
    const supplierAuthStore = useSupplierAuthStore();
    const isValidSession = await supplierAuthStore.validateSession();

    if (!isValidSession) {
      next({ path: '/supplier/login', query: { redirect: to.fullPath } });
      return;
    }
  }

  // Redirect supplier login if already authenticated
  if (to.path === '/supplier/login') {
    const supplierAuthStore = useSupplierAuthStore();
    if (supplierAuthStore.isAuthenticated) {
      next({ path: '/supplier/dashboard' });
      return;
    }
  }

  // If navigating to any supplier route, skip employee auth guard logic below.
  // Supplier routes have their own auth (via requiresSupplierAuth meta) and login page.
  if (to.path.startsWith('/supplier')) {
    next();
    return;
  }

  const authStore = useAuthStore();

  // Routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/home',
    '/menu',
    '/stores',
    '/join-us',
    '/faq',
    '/rate-order',
    '/supplier/login',
    '/supplier/forgot-password',
    '/supplier/reset-password',
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

  // Enforce route meta role requirement
  if (to.meta?.requiresRole && Array.isArray(to.meta.requiresRole)) {
    if (!to.meta.requiresRole.includes(userRole)) {
      // If user is Super Admin or Chairman, always allow
      if (userRole !== 'Super Admin' && userRole !== 'Chairman of the Board') {
        next('/dashboard');
        return;
      }
    }
  }

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

  // Check manager access for manager-only routes
  if (requiresManagerAccess(to.path)) {
    if (!canAccessManagerRoutes(userRole)) {
      // Redirect to their appropriate dashboard
      const userDashboard = getUserDashboardRoute(userDepartment);

      // Show an error message
      console.warn(
        `Access denied: Only Manager, Chairman, and Super Admin roles can access ${to.path}`
      );

      next(userDashboard);
      return;
    }

    // Check department-specific access for managers
    const routeDepartment = getDepartmentFromRoute(to.path);
    // Managers can access HR manager routes (e.g., Employee Schedules) across departments
    if (
      routeDepartment &&
      routeDepartment !== 'Human Resource' &&
      routeDepartment !== userDepartment &&
      userRole !== 'Super Admin' &&
      userRole !== 'Chairman of the Board'
    ) {
      // Redirect to their appropriate dashboard
      const userDashboard = getUserDashboardRoute(userDepartment);

      // Show an error message
      console.warn(
        `Access denied: ${userRole} from ${userDepartment} department cannot access ${routeDepartment} routes`
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

  // Note: Board members can access HR routes; UI controls will hide specific actions/menu items.

  // If Super Admin or Board members navigate to /dashboard, redirect to executive dashboard
  if (to.path === '/dashboard' || to.name === 'Home') {
    if (
      userRole === 'Super Admin' ||
      userRole === 'Chairman of the Board' ||
      userRole === 'Board of Directors'
    ) {
      next('/super-admin');
      return;
    }
  }

  next();
});

// Helper function to get user's appropriate dashboard
function getUserDashboardRoute(userDepartment) {
  const departmentRoutes = {
    'Human Resource': '/hr/attendance',
    Finance: '/finance/attendance',
    SCM: '/scm/attendance',
    Production: '/production/attendance',
    CRM: '/crm/attendance',
    Branch: '/branch/dashboard',
    System: '/admin/dashboard',
    Administration: '/admin/organizational-chart', // Board members go to org chart
  };

  return departmentRoutes[userDepartment] || '/dashboard';
}

export default router;
