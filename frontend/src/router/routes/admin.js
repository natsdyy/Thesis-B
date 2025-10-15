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
    path: 'branch-manager',
    name: 'AdminBranchManager',
    component: () => import('../../views/admin/BranchManager.vue'),
    meta: {
      title: 'Branch Management',
      permission: 'Manage Branch Management',
      superAdminOnly: true,
    },
  },
  {
    path: 'organizational-chart',
    name: 'AdminOrganizationalChart',
    component: () => import('../../views/admin/OrganizationalChart.vue'),
    meta: {
      title: 'Organizational Chart',
      permission: 'Manage Organizational Chart',
      requiresAuth: true,
      requiresRole: [
        'Super Admin',
        'Chairman of the Board',
        'Board of Directors',
      ],
    },
  },
  {
    path: 'attendance',
    name: 'AdminAttendance',
    component: () => import('../../views/common/DepartmentAttendance.vue'),
    meta: {
      title: 'My Attendance',
      permission: 'View Attendance',
    },
  },
];
