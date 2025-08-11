export default [
  {
    path: 'dashboard',
    name: 'AdminDashboard',
    component: () => import('../../views/admin/Dashboard.vue'),
    meta: { title: 'Admin Dashboard' },
  },
  {
    path: 'users',
    name: 'AdminUsers',
    component: () => import('../../views/admin/Users.vue'),
    meta: { title: 'User Management' },
  },
  {
    path: 'roles',
    name: 'AdminRoles',
    component: () => import('../../views/admin/Roles.vue'),
    meta: { title: 'Role Management' },
  },
  {
    path: 'settings',
    name: 'AdminSettings',
    component: () => import('../../views/admin/Settings.vue'),
    meta: { title: 'System Settings' },
  },
];
