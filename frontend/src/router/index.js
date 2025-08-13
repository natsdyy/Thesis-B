import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

// Import route modules
import hrRoutes from './routes/hr';
import scmRoutes from './routes/scm';
import financeRoutes from './routes/finance';
import productionRoutes from './routes/production';
import crmRoutes from './routes/crm';
import adminRoutes from './routes/admin';

// Import layout components
import DashboardLayout from '../layouts/DashboardLayout.vue';

// Import page components
import HomePage from '../views/HomePage.vue';
import NotFound from '../views/NotFound.vue';
import Login from '../views/Login.vue'; // Add this import

const routes = [
  {
    path: '/',
    redirect: '/login', // Change this to redirect to login instead of dashboard
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
        meta: { title: 'Dashboard', requiresAuth: true }, // Add requiresAuth
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
    },
  },
  // Supply Chain routes
  {
    path: '/scm',
    component: DashboardLayout,
    children: scmRoutes,
    meta: {
      title: 'Supply Chain',
      department: 'Supply Chain',
      requiresAuth: true,
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
    },
  },
  // CRM routes
  {
    path: '/crm',
    component: DashboardLayout,
    children: crmRoutes,
    meta: {
      title: 'Customer Relationship',
      department: 'Customer Relationship',
      requiresAuth: true,
    },
  },
  // Admin routes (Super Admin only)
  {
    path: '/admin',
    component: DashboardLayout,
    children: adminRoutes,
    meta: {
      title: 'Administration',
      department: 'Administration',
      requiresAuth: true,
      superAdminOnly: true,
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

// Add a global navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Routes that don't require authentication
  const publicRoutes = ['/', '/login'];

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

  next();
});

export default router;
