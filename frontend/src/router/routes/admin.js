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
      requiresAuth: true,
      requiresRole: [
        'Super Admin',
        'Chairman of the Board',
        'Board of Directors',
      ],
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
    path: 'faq-manager',
    name: 'AdminFAQManager',
    component: () => import('../../views/admin/FAQManager.vue'),
    meta: {
      title: 'FAQ Management',
      permission: 'Manage FAQ',
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
  {
    path: 'profile',
    name: 'AdminProfile',
    component: () => import('../../views/common/DepartmentProfile.vue'),
    meta: {
      title: 'Profile',
      requiresAuth: true,
      requiresRole: [
        'Super Admin',
        'Chairman of the Board',
        'Board of Directors',
      ],
    },
  },
];
