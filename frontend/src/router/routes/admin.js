export default [
  {
    path: 'dashboard',
    name: 'AdminDashboard',
    component: () => import('../../views/admin/Dashboard.vue'),
    meta: {
      title: 'Admin Dashboard',
      permission: 'Manage Dashboard',
      superAdminOnly: true,
    },
  },
  {
    path: 'users',
    name: 'AdminUsers',
    component: () => import('../../views/admin/Users.vue'),
    meta: {
      title: 'User Management',
      permission: 'Manage User Management',
      superAdminOnly: true,
    },
  },
  {
    path: 'roles',
    name: 'AdminRoles',
    component: () => import('../../views/admin/Roles.vue'),
    meta: {
      title: 'Role Management',
      permission: 'Manage Role Management',
      superAdminOnly: true, // Only Super Admin can manage roles
    },
  },
  {
    path: 'branches',
    name: 'AdminBranches',
    component: () => import('../../views/admin/Branches.vue'),
    meta: {
      title: 'Branch Management',
      permission: 'Manage Branch Management',
      superAdminOnly: true,
    },
  },
  {
    path: 'settings',
    name: 'AdminSettings',
    component: () => import('../../views/admin/Settings.vue'),
    meta: {
      title: 'System Settings',
      permission: 'Manage System Settings',
      superAdminOnly: true,
    },
  },
];
