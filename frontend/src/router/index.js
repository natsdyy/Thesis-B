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

// Navigation guards - Updated
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // Allow access to login page
  if (to.name === 'Login') {
    // If already authenticated, redirect to dashboard
    if (authStore.isAuthenticated) {
      next('/dashboard');
      return;
    }
    next();
    return;
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login page instead of auto-setting user
    next('/login');
    return;
  }

  // Check department access (only for non-Super Admin users)
  if (to.meta.department && !authStore.isSuperAdmin) {
    if (authStore.userDepartment !== to.meta.department) {
      // User doesn't have access to this department
      next('/dashboard');
      return;
    }
  }

  // Check if route is super admin only
  if (to.meta.superAdminOnly && !authStore.isSuperAdmin) {
    next('/dashboard');
    return;
  }

  // Set page title
  if (to.meta.title) {
    document.title = `${to.meta.title} - Countryside Steak House`;
  }

  next();
});

export default router;
